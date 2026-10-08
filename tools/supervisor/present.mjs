/**
 * `supervise present`: the evidence a publication is bound to.
 *
 * Every concerned repository must be clean and at origin/main: the SHAs the
 * presentation binds are those HEADs. Each repository's local validations run
 * behind the publication guard (`guarded.mjs`), so a validation cannot
 * release, push, tag or dispatch a workflow, even by mistake. The report is
 * Markdown; its content is also written to the train record, where `publish`,
 * `converge`, `release` and `close` check it still holds (`binding.mjs`).
 *
 * A consumer the train changes must carry a version that has no release yet:
 * `release` tags what `package.json` says, it writes no version.
 *
 * A provider of the train is packed for nothing, once (`packedFiles.mjs`): the
 * files its package publishes are what its consumers are validated against
 * (`providerLinks.mjs`), and their fingerprint is written beside its commit.
 *
 * A checkout is clean when the validations start, and must be clean when they
 * end: a validation or a packaging that rewrites a tracked file (a generator
 * that overwrites a committed output) leaves a commit that does not hold what
 * the package publishes, so the train is not presentable.
 *
 * The whole output of each command is kept beside the train (`logs.mjs`), and
 * the report names it for every failure. The record keeps the duration of a
 * validation, never the path of its log: a record is committed, a log is local.
 */
import { fetchOrigin, git, gitOut, isRepository, revParse } from "./git.mjs";
import { announcedPublications, computeDigest, concernedRepos, trainFilesOf } from "./digest.mjs";
import { evaluateTrain } from "./next.mjs";
import { basename } from "node:path";
import { evidenceKey, isGreen, reusableValidations } from "./evidence.mjs";
import { LINKED_PROVIDERS } from "./guarded.mjs";
import { formatDuration, trainLogs } from "./logs.mjs";
import { packedFiles } from "./packedFiles.mjs";
import { packageManager, packageJson } from "./preview.mjs";
import { planProviderLinks, withProviderLinks } from "./providerLinks.mjs";
import { releaseExists } from "./gh.mjs";
import { tagCommit, versionAt } from "./consumerRelease.mjs";
import { TRAINS_PATH } from "./train.mjs";
import { repoById, repoDir, SupervisorError } from "./topology.mjs";

function checkPreconditions(root, topology, train, repos) {
	const evaluation = evaluateTrain(root, topology, train);
	const pending = evaluation.items.filter((item) => item.state !== "done");
	if (pending.length > 0) {
		throw new SupervisorError(`present: not every item is done: ${pending.map((item) => `${item.label} (${item.state})`).join(", ")}; see supervise next`, 1);
	}
	return checkCheckouts(root, repos, "present");
}

/** What differs in the checkout from its commit, as `git status --porcelain` lines. The coordinator's train records are not a change. */
function changedFiles(dir, repo) {
	const pathspec = repo.role === "coordinator" ? ["--", ".", `:(exclude)${TRAINS_PATH}`] : [];
	return gitOut(dir, ["status", "--porcelain", ...pathspec]).split(/\r?\n/).filter((line) => line.trim());
}

/** Per repository, the files the packaging and the validations changed in a checkout they found clean. */
function leftChanged(root, repos) {
	const reasons = [];
	for (const repo of repos) {
		const dir = repoDir(root, repo);
		// By content, not by `status`: with `autocrlf` a generator that rewrites a file with the same content
		// in another line ending leaves it listed as modified, and it is not a change.
		const pathspec = repo.role === "coordinator" ? ["--", ".", `:(exclude)${TRAINS_PATH}`] : [];
		const changed = [
			...gitOut(dir, ["diff", "--name-only", "HEAD", ...pathspec]).split(/\r?\n/),
			...gitOut(dir, ["ls-files", "--others", "--exclude-standard", ...pathspec]).split(/\r?\n/),
		].filter((file) => file.trim());
		if (changed.length === 0) continue;
		const shown = changed.slice(0, 8).join(", ") + (changed.length > 8 ? `, and ${changed.length - 8} more` : "");
		reasons.push(`${repo.id}: its packaging or its validations changed ${changed.length} file(s) of the checkout: ${shown}; a generator that overwrites a committed file means the commit does not hold what is published: commit what it generates, then present again`);
	}
	return reasons;
}

/**
 * Every checkout clean and at origin/main, after a fetch: the SHAs a command
 * reports are then the ones GitHub has. The coordinator's train records are
 * not a change of the checkout, the supervisor writes them.
 */
export function checkCheckouts(root, repos, label) {
	const problems = [];
	const heads = {};
	for (const repo of repos) {
		const dir = repoDir(root, repo);
		if (!isRepository(dir)) {
			problems.push(`${repo.id}: no git repository at ${dir}`);
			continue;
		}
		fetchOrigin(dir);
		const head = revParse(dir, "HEAD");
		const originMain = revParse(dir, "origin/main");
		const dirty = changedFiles(dir, repo).join(" ");
		if (dirty) problems.push(`${repo.id}: uncommitted changes in ${dir}; commit or stash them`);
		if (!originMain) problems.push(`${repo.id}: origin/main is unknown in ${dir}`);
		else if (head !== originMain) {
			problems.push(`${repo.id}: HEAD ${head ? head.slice(0, 10) : "(none)"} is not origin/main ${originMain.slice(0, 10)}; run: git -C ${dir} switch main && git -C ${dir} pull --ff-only`);
		}
		heads[repo.id] = originMain;
	}
	if (problems.length > 0) throw new SupervisorError(`${label}: the repositories are not ready\n  ${problems.join("\n  ")}`, 1);
	return heads;
}

/**
 * A consumer the train changes needs a version that was never released: the
 * train tags it. It is changed when the train brings it the archive of a
 * provider, or when its presented commit is not the one its release was cut
 * from. A release the train recorded itself is its own, not a refusal; a
 * consumer left as its release found it is neither released nor refused.
 */
function releasedVersions(root, topology, train, entries) {
	const adopting = new Set();
	for (const item of train.items) {
		for (const consumer of repoById(topology, item.repo).consumers ?? []) adopting.add(consumer);
	}
	const reasons = [];
	for (const entry of entries.filter((candidate) => candidate.role !== "provider")) {
		const repo = repoById(topology, entry.repo);
		const dir = repoDir(root, repo);
		const version = versionAt(dir, entry.sha);
		if (!version) continue;
		const tag = `v${version}`;
		if ((train.consumerReleases ?? []).some((release) => release.repo === repo.id && release.tag === tag)) continue;
		if (!releaseExists(repo.repository, tag)) continue;
		const released = tagCommit(dir, tag);
		const pathspec = repo.role === "coordinator" ? ["--", ".", `:(exclude)${TRAINS_PATH}`] : [];
		const unchanged = !adopting.has(repo.id) && released !== null && git(dir, ["diff", "--quiet", released, entry.sha, ...pathspec]).status === 0;
		if (!unchanged) reasons.push(`${repo.id}: package.json is at ${version} and the release ${tag} of ${repo.repository} already exists; prepare a new version with the change`);
	}
	return reasons;
}

/** The step a validation's log is filed under; its rank is its place among the repository's validations, from 1. */
const PRESENT_STEP = "present";

/** Whether a `prepack` script runs the `build` script itself: packing then builds, a separate build would run it twice. */
function prepackBuilds(scripts) {
	return /(^|[\s&|;])(npm|pnpm|yarn)(\s+run)?\s+build(?=$|[\s&|;])/.test(scripts.prepack ?? "");
}

/**
 * Build, then pack for nothing, each provider the train changes: once, whatever
 * the number of its consumers. The result of a provider is what its package
 * publishes (`files`, `sha256`), or the step that failed (`failed`).
 */
function packProviders(root, topology, train, repos, logs, failures) {
	const packed = new Map();
	const whole = (result) => (result.log ? ` (whole output: ${basename(result.log)})` : "");
	for (const repo of repos.filter((candidate) => candidate.role === "provider" && train.items.some((item) => item.repo === candidate.id))) {
		const dir = repoDir(root, repo);
		const scripts = packageJson(dir)?.scripts ?? {};
		if (scripts.build && !prepackBuilds(scripts)) {
			const build = logs.run(repo.id, "build", dir, [packageManager(dir), "run", "build"], "present");
			if (build.status !== 0) {
				failures.push(`${repo.id}: ${build.command.join(" ")} exited ${build.status}${whole(build)}`);
				packed.set(repo.id, { failed: "build" });
				continue;
			}
		}
		const pack = packedFiles(dir, (command) => logs.run(repo.id, "pack", dir, command, "present"));
		if (pack.error) {
			failures.push(`${repo.id}: ${pack.error}${whole(pack.result)}`);
			packed.set(repo.id, { failed: "packaging" });
			continue;
		}
		packed.set(repo.id, { files: pack.files, sha256: pack.sha256 });
	}
	return packed;
}

/** Why the validations of a consumer are not started: the providers it would be linked to that could not be built or packed. */
function brokenProviders(links, packed) {
	const steps = [];
	for (const step of ["build", "packaging"]) {
		const ids = links.filter((link) => packed.get(link.repo)?.failed === step).map((link) => link.repo);
		if (ids.length > 0) steps.push(`the ${step} of ${ids.join(", ")} failed`);
	}
	return steps.join("; ");
}

/**
 * `fresh` validates everything; otherwise a repository whose last green
 * presentation was proved on the same files, packages, commands and Node keeps
 * its result (`evidence.mjs`).
 */
export function presentTrain(root, topology, train, logs = trainLogs(root, topology, train.id), { fresh = false } = {}) {
	if (train.status !== "open") throw new SupervisorError(`present: train "${train.id}" is closed`);
	const repos = concernedRepos(topology, train);
	const heads = checkPreconditions(root, topology, train, repos);
	const buildFailures = [];
	const packed = packProviders(root, topology, train, repos, logs, buildFailures);
	const entries = repos.map((repo) => {
		const dir = repoDir(root, repo);
		const item = train.items.find((entry) => entry.repo === repo.id) ?? null;
		const sha = heads[repo.id];
		const base = item?.baseSha ?? null;
		const baseKnown = base !== null && git(dir, ["cat-file", "-e", `${base}^{commit}`]).status === 0;
		const commits = baseKnown
			? gitOut(dir, ["log", "--format=%H %s", `${base}..${sha}`]).split("\n").filter(Boolean)
				.map((line) => ({ sha: line.slice(0, 40), subject: line.slice(41) }))
			: [];
		const diffstat = baseKnown ? gitOut(dir, ["diff", "--stat", base, sha]) : "";
		const entry = { repo: repo.id, role: repo.role, sha, baseSha: base, commits, diffstat };
		const own = packed.get(repo.id);
		if (own?.sha256) entry.packed = { sha256: own.sha256, files: own.files.length };
		const links = repo.role === "provider" ? [] : planProviderLinks(root, topology, train, repo);
		const broken = brokenProviders(links, packed);
		// Behind a provider that does not build or pack, a consumer's validations cannot pass: they are not started.
		if (broken) {
			entry.validations = (repo.validations ?? []).map((command) => ({ command, status: -1, tail: "", notRun: broken }));
			return entry;
		}
		const key = evidenceKey({ dir, repo, sha, links: links.map((link) => ({ repo: link.repo, sha256: packed.get(link.repo)?.sha256 })), validations: repo.validations ?? [] });
		const previous = train.presentation?.repos?.find((candidate) => candidate.repo === repo.id);
		const reused = reusableValidations(previous, key, { fresh });
		if (reused) {
			entry.validations = reused;
			entry.evidence = previous.evidence;
			if (links.length > 0) entry.linkedProviders = links.map((link) => link.repo).sort();
			return entry;
		}
		const published = links.map((link) => ({ ...link, files: packed.get(link.repo).files }));
		entry.validations = withProviderLinks(dir, published, (replaced) => {
			const linked = replaced.map((link) => link.repo).sort();
			if (linked.length > 0) entry.linkedProviders = linked;
			const env = linked.length > 0 ? { [LINKED_PROVIDERS]: linked.map((id) => `${id}@${packed.get(id).sha256}`).join(",") } : {};
			return (repo.validations ?? []).map((command) => {
				const result = logs.run(repo.id, PRESENT_STEP, dir, command, "present", { env });
				return { command: result.command, status: result.status, tail: result.tail, durationMs: result.durationMs };
			});
		});
		if (key !== null && isGreen(entry.validations)) entry.evidence = { key, provedAt: new Date().toISOString() };
		return entry;
	});
	const reasons = [...buildFailures];
	reasons.push(...leftChanged(root, repos));
	for (const entry of entries) {
		if (entry.validations.length === 0) reasons.push(`${entry.repo}: no local validation is configured in the topology`);
		for (const validation of entry.validations.filter((result) => result.status !== 0)) {
			reasons.push(validation.notRun
				? `${entry.repo}: ${validation.command.join(" ")} not run: ${validation.notRun}`
				: `${entry.repo}: ${validation.command.join(" ")} exited ${validation.status}`);
		}
	}
	reasons.push(...releasedVersions(root, topology, train, entries));
	const publications = announcedPublications(topology, train);
	const trainFiles = trainFilesOf(repos);
	return {
		presentedAt: new Date().toISOString(),
		presentable: reasons.length === 0,
		reasons,
		digest: computeDigest({ id: train.id, repos: entries, trainFiles, publications }),
		repos: entries,
		trainFiles,
		publications,
	};
}

function short(sha) {
	return sha ? sha.slice(0, 10) : "-";
}

/** `logs` names, for each failure, the file that holds its whole output; without it the report keeps to the last lines. */
export function renderPresentation(train, presentation, logs = null) {
	const lines = [
		`# Train \`${train.id}\`: ${train.title}`,
		"",
		`Presented at ${presentation.presentedAt}, fingerprint \`${presentation.digest}\`.`,
		"",
		presentation.presentable
			? "**Presentable.** Nothing has been published. `pnpm supervise publish --run` publishes exactly these commits."
			: `**Not presentable**, nothing can be published:\n${presentation.reasons.map((reason) => `- ${reason}`).join("\n")}`,
	];
	for (const entry of presentation.repos) {
		const item = train.items.find((candidate) => candidate.repo === entry.repo);
		lines.push("", `## ${entry.repo} (${entry.role}) at \`${short(entry.sha)}\``, "");
		lines.push(item ? `Issue: [${entry.repo}#${item.issue}](${item.url}) ${item.title}` : "No item: receives the adoption commits of the train.");
		if (entry.baseSha) {
			lines.push("", `Commits since \`${short(entry.baseSha)}\`:`);
			lines.push(...(entry.commits.length ? entry.commits.map((commit) => `- \`${short(commit.sha)}\` ${commit.subject}`) : ["- none"]));
			if (entry.diffstat) lines.push("", "```", entry.diffstat, "```");
		}
		if (entry.packed) lines.push("", `Package: ${entry.packed.files} file(s), fingerprint \`${entry.packed.sha256}\`.`);
		for (const id of entry.linkedProviders ?? []) {
			const provider = presentation.repos.find((candidate) => candidate.repo === id);
			lines.push("", `Validated against the package of ${id}${provider?.packed ? `, fingerprint \`${provider.packed.sha256}\`` : ""}, in place of the installed one.`);
		}
		lines.push("", "Validations (behind the publication guard):");
		if (entry.validations.length === 0) lines.push("- none configured");
		for (const [index, validation] of entry.validations.entries()) {
			const command = `\`${validation.command.join(" ")}\``;
			if (validation.notRun) {
				lines.push(`- **not run**: ${command} (${validation.notRun})`);
				continue;
			}
			const took = Number.isInteger(validation.durationMs) ? ` (${formatDuration(validation.durationMs)})` : "";
			if (validation.reused) {
				lines.push(`- **reused**: ${command}${took}, proved at ${validation.reused} on the same files, packages, commands and Node; \`--fresh\` validates again`);
				continue;
			}
			lines.push(`- ${validation.status === 0 ? "passed" : `**failed (exit ${validation.status})**`}: ${command}${took}`);
			if (validation.status === 0) continue;
			const log = logs?.file(entry.repo, index + 1, PRESENT_STEP);
			if (log) lines.push(`  Whole output: \`${log}\``);
			if (validation.tail) lines.push("", "```", validation.tail, "```");
		}
	}
	if (logs?.dir) lines.push("", `The whole output of every command above is in \`${logs.dir}\`, until the train closes.`);
	lines.push("", "## Try it before publishing", "", "`pnpm supervise preview --vault <vault>` builds these checkouts, installs the Handbook packs of each provider in the vault, deploys Handbook next to its `data.json`, and serves each consumer's dev server on the same checkouts.");
	lines.push("", "## Publications `publish` will make", "", ...presentation.publications.map((publication) => `- ${publication}`));
	return lines.join("\n");
}
