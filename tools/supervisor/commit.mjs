/**
 * `commit <provider>`: land a provider's work and its consumers' adoption on
 * `origin/main` in one command, so `present` and `preview` can see them.
 *
 * The message of each repository is prepared beforehand in its
 * `.git/SUPERVISOR_COMMIT_MSG` (inside `.git`, so it never dirties the
 * checkout). Every check runs before the first write: a refused command
 * commits and pushes nothing. The coordinator's train records are never
 * committed here, as `present` never counts them as changes.
 *
 * `commit <repo> --only` lands one repository alone, whatever its role, under
 * the same checks; `--message` then stands for the prepared file.
 *
 * It commits what a person prepared, before any presentation; the writes of a
 * presented train are land.mjs. It publishes no release.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { fetchOrigin, git, gitOut, isRepository, revParse } from "./git.mjs";
import { TRAINS_PATH } from "./train.mjs";
import { repoById, repoDir, SupervisorError } from "./topology.mjs";

export const MESSAGE_FILE = "SUPERVISOR_COMMIT_MSG";

function pathspec(repo) {
	return repo.role === "coordinator" ? ["--", ".", `:(exclude)${TRAINS_PATH}`] : ["--", "."];
}

function messagePath(dir) {
	const path = gitOut(dir, ["rev-parse", "--git-path", MESSAGE_FILE]);
	return isAbsolute(path) ? path : resolve(dir, path);
}

/** The provider, then each of its consumers, as the topology declares them. */
export function commitRepos(topology, providerId) {
	const provider = repoById(topology, providerId);
	if (provider.role !== "provider") throw new SupervisorError(`commit: "${providerId}" is not a schema provider`, 2);
	return [provider, ...provider.consumers.map((id) => repoById(topology, id))];
}

/** One repository alone, whatever its role: the work of a session that touched nothing else. */
export function commitRepo(topology, repoId) {
	return [repoById(topology, repoId)];
}

/**
 * What each repository will do, or every reason none of them may.
 * `inline` is a message given on the command line, for a single repository.
 * `shared` is `ship`: the one message serves every repository that has changes
 * and no prepared message, and having nothing to do is not a refusal.
 */
export function planCommit(root, repos, inline = "", { shared = false } = {}) {
	const problems = [];
	const plan = [];
	for (const repo of repos) {
		const dir = repoDir(root, repo);
		if (!isRepository(dir)) {
			problems.push(`${repo.id}: no git repository at ${dir}`);
			continue;
		}
		if (!fetchOrigin(dir)) problems.push(`${repo.id}: git fetch origin failed in ${dir}`);
		const branch = gitOut(dir, ["branch", "--show-current"]);
		if (branch !== "main") problems.push(`${repo.id}: on "${branch || "(detached)"}", not main`);
		const head = revParse(dir, "HEAD");
		const originMain = revParse(dir, "origin/main");
		if (!originMain) problems.push(`${repo.id}: origin/main is unknown in ${dir}`);
		const behind = head && originMain ? Number(gitOut(dir, ["rev-list", "--count", "HEAD..origin/main"])) : 0;
		if (behind > 0) problems.push(`${repo.id}: ${behind} commit(s) behind origin/main; run: git -C ${dir} pull --ff-only`);
		const ahead = head && originMain ? Number(gitOut(dir, ["rev-list", "--count", "origin/main..HEAD"])) : 0;
		// Not gitOut: its trim would eat the leading space of the first status line.
		const changes = git(dir, ["status", "--porcelain", "--untracked-files=all", ...pathspec(repo)]).stdout.replace(/\s+$/, "");
		const file = messagePath(dir);
		const prepared = existsSync(file) ? readFileSync(file, "utf8").trim() : "";
		if (prepared && inline && !shared) problems.push(`${repo.id}: --message was given but a message already waits in ${file}`);
		const message = prepared || (shared && !changes ? "" : inline);
		if (changes && !message) problems.push(`${repo.id}: uncommitted changes but no message in ${file}`);
		if (!changes && message) problems.push(`${repo.id}: a message ${prepared ? `waits in ${file}` : "was given"} but there is nothing to commit`);
		plan.push({ repo, dir, file, message, changes, ahead, inline: !prepared });
	}
	if (problems.length > 0) throw new SupervisorError(`commit: nothing was committed\n  ${problems.join("\n  ")}`, 1);
	if (!shared && plan.every((entry) => !entry.changes && entry.ahead === 0)) {
		throw new SupervisorError("commit: nothing to commit or push in any repository", 1);
	}
	return plan;
}

export function renderCommitPlan(providerId, plan) {
	const lines = [`Commit and push for ${providerId}:`];
	for (const { repo, message, changes, ahead } of plan) {
		lines.push("", `${repo.id}:`);
		if (changes) {
			lines.push(`  commit "${message.split("\n")[0]}"`);
			for (const line of changes.split("\n")) lines.push(`    ${line}`);
		}
		const pushed = ahead + (changes ? 1 : 0);
		lines.push(pushed > 0 ? `  push ${pushed} commit(s) to origin/main` : "  nothing to do");
	}
	return `${lines.join("\n")}\n\n`;
}

function run(dir, args) {
	const result = git(dir, args);
	if (result.status !== 0) throw new SupervisorError(`commit: git ${args.join(" ")} failed in ${dir}\n${result.stderr.trim()}`, 1);
	return result.stdout.trim();
}

/** Commit every repository first, then push them: a refused commit pushes nothing. */
export function executeCommit(plan) {
	for (const entry of plan) {
		if (!entry.changes) continue;
		run(entry.dir, ["add", "--all", ...pathspec(entry.repo)]);
		if (entry.inline) {
			run(entry.dir, ["commit", "--quiet", "-m", entry.message, ...pathspec(entry.repo)]);
			continue;
		}
		run(entry.dir, ["commit", "--quiet", "--file", entry.file, ...pathspec(entry.repo)]);
		rmSync(entry.file);
	}
	const lines = [];
	for (const entry of plan) {
		if (!entry.changes && entry.ahead === 0) continue;
		run(entry.dir, ["push", "--quiet", "origin", "HEAD:main"]);
		lines.push(`${entry.repo.id}: ${run(entry.dir, ["log", "--oneline", "-1"])}`);
	}
	return lines;
}

export const COMMIT_COMMANDS = {
	commit: {
		usage: "commit <provider> | <repo> --only [--message <text>]  commit and push a provider with its consumers, or one repository alone (messages in .git/SUPERVISOR_COMMIT_MSG)",
		options: { only: { type: "boolean" }, message: { type: "string" } },
		run(context, values, positionals) {
			const [providerId, ...extra] = positionals;
			if (!providerId || extra.length > 0) throw new SupervisorError("commit: name exactly one repository, e.g. supervise commit schema-adrenaline", 2);
			if (values.message !== undefined && !values.only) throw new SupervisorError("commit: --message names one commit, so it goes with --only", 2);
			const inline = (values.message ?? "").trim();
			if (values.message !== undefined && !inline) throw new SupervisorError("commit: --message is empty", 2);
			const repos = values.only ? commitRepo(context.topology, providerId) : commitRepos(context.topology, providerId);
			const plan = planCommit(context.root, repos, inline);
			process.stderr.write(renderCommitPlan(providerId, plan));
			for (const line of executeCommit(plan)) console.log(line);
			return 0;
		},
	},
};
