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
 * The whole output of each command is kept beside the train (`logs.mjs`), and
 * the report names it for every failure. The record keeps the duration of a
 * validation, never the path of its log: a record is committed, a log is local.
 */
import { fetchOrigin, git, gitOut, isRepository, revParse } from "./git.mjs";
import { announcedPublications, computeDigest, concernedRepos, trainFilesOf } from "./digest.mjs";
import { evaluateTrain } from "./next.mjs";
import { basename } from "node:path";
import { formatDuration, trainLogs } from "./logs.mjs";
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
		const pathspec = repo.role === "coordinator" ? ["--", ".", `:(exclude)${TRAINS_PATH}`] : [];
		const dirty = gitOut(dir, ["status", "--porcelain", ...pathspec]);
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

export function presentTrain(root, topology, train, logs = trainLogs(root, topology, train.id)) {
	if (train.status !== "open") throw new SupervisorError(`present: train "${train.id}" is closed`);
	const repos = concernedRepos(topology, train);
	const heads = checkPreconditions(root, topology, train, repos);
	const buildFailures = [];
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
		const links = repo.role === "provider" ? [] : planProviderLinks(root, topology, train, repo);
		const broken = [];
		for (const link of links) {
			const build = packageJson(link.dir)?.scripts?.build ? logs.run(repo.id, `build-${link.repo}`, link.dir, [packageManager(link.dir), "run", "build"], "present") : null;
			if (!build || build.status === 0) continue;
			broken.push(link.repo);
			buildFailures.push(`${link.repo}: ${build.command.join(" ")} exited ${build.status}${build.log ? ` (whole output: ${basename(build.log)})` : ""}`);
		}
		// Behind a provider that does not build, a consumer's validations cannot pass: they are not started.
		const validations = broken.length > 0
			? (repo.validations ?? []).map((command) => ({ command, status: -1, tail: "", notRun: `the build of ${broken.join(", ")} failed` }))
			: withProviderLinks(dir, links, () => (repo.validations ?? []).map((command) => {
				const result = logs.run(repo.id, PRESENT_STEP, dir, command, "present");
				return { command: result.command, status: result.status, tail: result.tail, durationMs: result.durationMs };
			}));
		return { repo: repo.id, role: repo.role, sha, baseSha: base, commits, diffstat, validations };
	});
	const reasons = [...buildFailures];
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
		lines.push("", "Validations (behind the publication guard):");
		if (entry.validations.length === 0) lines.push("- none configured");
		for (const [index, validation] of entry.validations.entries()) {
			const command = `\`${validation.command.join(" ")}\``;
			if (validation.notRun) {
				lines.push(`- **not run**: ${command} (${validation.notRun})`);
				continue;
			}
			const took = Number.isInteger(validation.durationMs) ? ` (${formatDuration(validation.durationMs)})` : "";
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
