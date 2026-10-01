/**
 * `commit <provider>`: land a provider's work and its consumers' adoption on
 * `origin/main` in one typed yes, so `present` and `preview` can see them.
 *
 * The message of each repository is prepared beforehand in its
 * `.git/SUPERVISOR_COMMIT_MSG` (inside `.git`, so it never dirties the
 * checkout). Every check runs before the first write: a refused command
 * commits and pushes nothing. The coordinator's train records are never
 * committed here, as `present` never counts them as changes.
 *
 * This is the one place the supervisor commits and pushes, and only on the id
 * typed on a terminal; it publishes no release.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { createInterface } from "node:readline/promises";
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

/** What each repository will do, or every reason none of them may. */
export function planCommit(root, repos) {
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
		const changes = gitOut(dir, ["status", "--porcelain", "--untracked-files=all", ...pathspec(repo)]);
		const file = messagePath(dir);
		const message = existsSync(file) ? readFileSync(file, "utf8").trim() : "";
		if (changes && !message) problems.push(`${repo.id}: uncommitted changes but no message in ${file}`);
		if (!changes && message) problems.push(`${repo.id}: a message waits in ${file} but there is nothing to commit`);
		plan.push({ repo, dir, file, message, changes, ahead });
	}
	if (problems.length > 0) throw new SupervisorError(`commit: nothing was committed\n  ${problems.join("\n  ")}`, 1);
	if (plan.every((entry) => !entry.changes && entry.ahead === 0)) {
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

export async function askProviderId(id) {
	if (!process.stdin.isTTY) {
		throw new SupervisorError("commit needs an interactive terminal: the yes is the provider id typed by you, there is no --yes", 1);
	}
	const prompt = createInterface({ input: process.stdin, output: process.stderr });
	try {
		const answer = (await prompt.question(`Type the provider id (${id}) to commit and push, anything else to refuse: `)).trim();
		return answer === id;
	} finally {
		prompt.close();
	}
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
		usage: "commit <provider>                         type the provider id to commit and push it with its consumers (messages in .git/SUPERVISOR_COMMIT_MSG)",
		options: {},
		async run(context, _values, positionals) {
			const [providerId, ...extra] = positionals;
			if (!providerId || extra.length > 0) throw new SupervisorError("commit: name exactly one provider, e.g. supervise commit schema-adrenaline", 2);
			const plan = planCommit(context.root, commitRepos(context.topology, providerId));
			process.stderr.write(renderCommitPlan(providerId, plan));
			if (!(await askProviderId(providerId))) throw new SupervisorError(`commit: the typed id is not "${providerId}"; nothing was committed`, 1);
			for (const line of executeCommit(plan)) console.log(line);
			return 0;
		},
	},
};
