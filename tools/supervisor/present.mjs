/**
 * `supervise present`: the evidence a person needs before saying yes.
 *
 * Every concerned repository must be clean and at origin/main: the SHAs the
 * approval binds are those HEADs. Each repository's local validations run
 * behind `guard/`, a PATH prefix whose gh and git refuse to publish, so a
 * validation cannot release, push, tag or dispatch a workflow, even by
 * mistake. The report is Markdown; its content is also written to the train
 * record, where `approve` finds it.
 */
import { spawnSync } from "node:child_process";
import { delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchOrigin, git, gitOut, isRepository, revParse } from "./git.mjs";
import { announcedPublications, computeDigest, concernedRepos, trainFilesOf } from "./digest.mjs";
import { evaluateTrain } from "./next.mjs";
import { TRAINS_PATH } from "./train.mjs";
import { repoDir, SupervisorError } from "./topology.mjs";

export const GUARD_DIR = fileURLToPath(new URL("./guard", import.meta.url));

const TAIL = 30;

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

/** Run `command` in `dir` behind the publication guard; its output is kept to its last lines. */
export function runGuarded(dir, command, label) {
	process.stderr.write(`${label}: ${command.join(" ")} in ${dir}\n`);
	const result = spawnSync(command[0], command.slice(1), {
		cwd: dir,
		encoding: "utf8",
		env: { ...process.env, PATH: `${GUARD_DIR}${delimiter}${process.env.PATH ?? ""}`, SUPERVISOR_PRESENT: "1" },
		maxBuffer: 256 * 1024 * 1024,
	});
	const output = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`;
	return {
		command,
		status: result.error ? 127 : (result.status ?? 1),
		tail: output.trimEnd().split("\n").slice(-TAIL).join("\n"),
	};
}

export function presentTrain(root, topology, train) {
	if (train.status !== "open") throw new SupervisorError(`present: train "${train.id}" is closed`);
	const repos = concernedRepos(topology, train);
	const heads = checkPreconditions(root, topology, train, repos);
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
		const validations = (repo.validations ?? []).map((command) => runGuarded(dir, command, "present"));
		return { repo: repo.id, role: repo.role, sha, baseSha: base, commits, diffstat, validations };
	});
	const reasons = [];
	for (const entry of entries) {
		if (entry.validations.length === 0) reasons.push(`${entry.repo}: no local validation is configured in the topology`);
		for (const validation of entry.validations.filter((result) => result.status !== 0)) {
			reasons.push(`${entry.repo}: ${validation.command.join(" ")} exited ${validation.status}`);
		}
	}
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

export function renderPresentation(train, presentation) {
	const lines = [
		`# Train \`${train.id}\`: ${train.title}`,
		"",
		`Presented at ${presentation.presentedAt}, fingerprint \`${presentation.digest}\`.`,
		"",
		presentation.presentable
			? "**Presentable.** Nothing has been published. Approve with `pnpm supervise approve`, or say nothing: silence is not an approval."
			: `**Not presentable**, approval refused:\n${presentation.reasons.map((reason) => `- ${reason}`).join("\n")}`,
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
		for (const validation of entry.validations) {
			lines.push(`- ${validation.status === 0 ? "passed" : `**failed (exit ${validation.status})**`}: \`${validation.command.join(" ")}\``);
			if (validation.status !== 0 && validation.tail) lines.push("", "```", validation.tail, "```");
		}
		if (entry.role === "provider") {
			lines.push("", entry.repo === "schema-pbta"
				? "Local preview: in obsidian-handbook, `pnpm dev:schema-pbta` builds Handbook against this checkout (#65)."
				: "Local preview: none exists yet for this provider.");
		}
	}
	lines.push("", "## Publications covered by an approval", "", ...presentation.publications.map((publication) => `- ${publication}`));
	return lines.join("\n");
}
