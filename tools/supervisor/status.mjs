/**
 * `supervise status`: where each repository stands, which releases exist,
 * which pins each consumer carries, and every gap between them.
 *
 * The JSON form is the contract later commands build on
 * (`supervisor/status.schema.json`); the text form is the same content, one
 * block per repository, then the gaps.
 */
import { latestReleases } from "./gh.mjs";
import { observeRepo } from "./git.mjs";
import { readPin } from "./pins.mjs";
import {
	consumersOf,
	providersOf,
	repoDir,
	schemaErrors,
	schemaValidator,
	SupervisorError,
} from "./topology.mjs";

function gap(kind, repo, message) {
	return { kind, repo, message };
}

export function collectStatus(root, topology, { fetch = true } = {}) {
	const gaps = [];
	const repos = topology.repos.map((repo) => {
		const observed = observeRepo(repoDir(root, repo), { fetch });
		const entry = {
			id: repo.id,
			path: repo.path,
			repository: repo.repository,
			role: repo.role,
			present: observed.present,
			fetched: observed.fetched ?? null,
			branch: observed.branch ?? null,
			head: observed.head ?? null,
			originMain: observed.originMain ?? null,
			clean: observed.clean ?? null,
			ahead: observed.ahead ?? null,
			behind: observed.behind ?? null,
		};
		if (!observed.present) {
			gaps.push(gap("missing-repo", repo.id, `${repo.id}: no git repository at ${repoDir(root, repo)}`));
		} else if (observed.fetched === false) {
			gaps.push(gap("fetch-failed", repo.id, `${repo.id}: git fetch origin failed, origin/main may be stale`));
		}
		if (observed.present && !observed.originMain) {
			gaps.push(gap("no-origin-main", repo.id, `${repo.id}: origin/main is unknown`));
		}
		if (observed.behind) {
			gaps.push(gap(
				"behind",
				repo.id,
				`${repo.id}: ${observed.branch ?? "detached HEAD"} is ${observed.behind} commit(s) behind origin/main`,
			));
		}
		return entry;
	});

	const providers = providersOf(topology).map((provider) => {
		try {
			return { id: provider.id, package: provider.package, repository: provider.repository, ...latestReleases(provider.repository), error: null };
		} catch (error) {
			gaps.push(gap("releases-unavailable", provider.id, `${provider.id}: releases could not be read (${error.message})`));
			return { id: provider.id, package: provider.package, repository: provider.repository, latestRc: null, latestFinal: null, error: error.message };
		}
	});

	const pins = [];
	for (const consumer of consumersOf(topology)) {
		const observed = repos.find((repo) => repo.id === consumer.id);
		if (!observed.present) continue;
		for (const provider of providersOf(topology)) {
			if (!provider.consumers.includes(consumer.id)) continue;
			const pin = readPin(repoDir(root, consumer), provider.package);
			if (!pin) {
				gaps.push(gap("pin-missing", consumer.id, `${consumer.id}: no pin for ${provider.package}`));
				continue;
			}
			pins.push({ consumer: consumer.id, provider: provider.id, ...pin });
			pinGaps(consumer, provider, pin, providers, gaps);
		}
	}

	for (const provider of providersOf(topology)) {
		const urls = pins.filter((pin) => pin.provider === provider.id);
		const distinct = urls.filter((pin, index) => urls.findIndex((other) => other.url === pin.url) === index);
		if (distinct.length > 1) {
			gaps.push(gap(
				"pin-divergent",
				provider.id,
				`${provider.package}: consumers disagree\n${distinct.map((pin) => `    ${pin.consumer}: ${pin.url}`).join("\n")}`,
			));
		}
	}

	return { version: 1, root, repos, providers, pins, gaps, train: null };
}

function pinGaps(consumer, provider, pin, providers, gaps) {
	if (!pin.tag) {
		gaps.push(gap("pin-invalid", consumer.id, `${consumer.id}: ${provider.package} is not a release asset URL: ${pin.url}`));
		return;
	}
	for (const lock of pin.lockfiles) {
		if (lock.url !== pin.url || !lock.integrity) {
			gaps.push(gap(
				"pin-lock-mismatch",
				consumer.id,
				`${consumer.id}: ${lock.file} resolves ${provider.package} to ${lock.url ?? "nothing"}${lock.integrity ? "" : " without SRI"}, package.json pins ${pin.url}`,
			));
		}
	}
	if (pin.rc) {
		const integrity = pin.lockfiles.find((lock) => lock.integrity)?.integrity ?? "no SRI";
		gaps.push(gap("pin-rc", consumer.id, `${consumer.id}: ${provider.package} is pinned to release candidate ${pin.tag}: ${pin.url} (${integrity})`));
		return;
	}
	const latest = providers.find((entry) => entry.id === provider.id)?.latestFinal;
	if (latest && latest.tag !== pin.tag) {
		gaps.push(gap("pin-outdated", consumer.id, `${consumer.id}: ${provider.package} is pinned to ${pin.tag}, latest final is ${latest.tag}`));
	}
}

export function assertStatusShape(status) {
	const validate = schemaValidator("status.schema.json");
	if (!validate(status)) {
		throw new SupervisorError(`status does not match status.schema.json\n  ${schemaErrors(validate).join("\n  ")}`);
	}
}

function short(sha) {
	return sha ? sha.slice(0, 10) : "-";
}

export function renderStatus(status) {
	const lines = [`Supervisor status (${status.root})`, ""];
	for (const repo of status.repos) {
		lines.push(`${repo.id} [${repo.role}] ${repo.repository}`);
		if (!repo.present) {
			lines.push("  missing", "");
			continue;
		}
		const distance = repo.ahead === null ? "origin/main unknown" : `ahead ${repo.ahead}, behind ${repo.behind}`;
		lines.push(`  branch ${repo.branch ?? "(detached)"} @ ${short(repo.head)}, ${repo.clean ? "clean" : "dirty"}, ${distance} (origin/main ${short(repo.originMain)})`);
		const provider = status.providers.find((entry) => entry.id === repo.id);
		if (provider) {
			lines.push(`  releases: latest final ${provider.latestFinal?.tag ?? "-"}, latest rc ${provider.latestRc?.tag ?? "-"}`);
		}
		for (const pin of status.pins.filter((entry) => entry.consumer === repo.id)) {
			const integrity = pin.lockfiles.map((lock) => `${lock.file} ${lock.integrity ? lock.integrity.slice(0, 19) + "…" : "no SRI"}`).join(", ");
			lines.push(`  pin ${pin.package} ${pin.tag ?? pin.url}${pin.rc ? " (rc)" : ""}${integrity ? ` [${integrity}]` : ""}`);
		}
		lines.push("");
	}
	if (status.train) {
		lines.push(`Active train: ${status.train.id} (${status.train.status})`, "");
	}
	if (status.gaps.length === 0) {
		lines.push("No gaps: the five repositories are aligned.");
	} else {
		lines.push(`Gaps (${status.gaps.length}):`);
		for (const entry of status.gaps) lines.push(`  - [${entry.kind}] ${entry.message}`);
	}
	return lines.join("\n");
}
