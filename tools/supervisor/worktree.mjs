/**
 * `worktree <dir>`: a second set of checkouts to run a train in, beside the
 * work a person keeps going in the usual ones.
 *
 * Every command reads its repositories at `<root>/<path>` and wants them
 * clean, so a train waits for any other work in progress. `--root <dir>` points
 * it at another set instead. This command builds that set: one linked worktree
 * per repository, detached at `origin/main` (git keeps `main` in a single
 * checkout), with the frozen install each repository's validations need.
 * It reads no train and writes nothing in the usual checkouts but git's own
 * worktree records.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fetchOrigin, git, isRepository } from "./git.mjs";
import { installCommand } from "./land.mjs";
import { spawnCommand } from "./spawn.mjs";
import { repoById, repoDir, SupervisorError } from "./topology.mjs";

/** What each repository will do, or every reason none of them may. */
export function planWorktrees(root, topology, target, ids = []) {
	const repos = ids.length > 0 ? ids.map((id) => repoById(topology, id)) : topology.repos;
	const problems = [];
	const plan = [];
	for (const repo of repos) {
		const source = repoDir(root, repo);
		const dir = resolve(target, repo.path);
		if (!isRepository(source)) problems.push(`${repo.id}: no git repository at ${source}`);
		else if (!fetchOrigin(source)) problems.push(`${repo.id}: git fetch origin failed in ${source}`);
		if (existsSync(dir)) problems.push(`${repo.id}: ${dir} already exists`);
		plan.push({ repo, source, dir });
	}
	if (problems.length > 0) throw new SupervisorError(`worktree: nothing was created\n  ${problems.join("\n  ")}`, 1);
	return plan;
}

export function createWorktrees(plan, { install }) {
	for (const { repo, source, dir } of plan) {
		const result = git(source, ["worktree", "add", "--quiet", "--detach", dir, "origin/main"]);
		if (result.status !== 0) throw new SupervisorError(`worktree: git worktree add failed for ${repo.id}\n${result.stderr.trim()}`, 1);
		console.log(`${repo.id}: ${dir}`);
		const command = install ? installCommand(dir) : null;
		if (!command) continue;
		const done = spawnCommand(command[0], command.slice(1), { cwd: dir, stdio: "inherit" });
		if (done.status !== 0) throw new SupervisorError(`worktree: \`${command.join(" ")}\` failed in ${dir}`, 1);
	}
}

export const WORKTREE_COMMANDS = {
	worktree: {
		usage: "worktree <dir> [--repos a,b] [--no-install]   create a worktree of each repository under <dir>, to run a train beside other work (then: --root <dir>)",
		options: { repos: { type: "string" }, "no-install": { type: "boolean" } },
		run(context, values, positionals) {
			const [target, ...extra] = positionals;
			if (!target || extra.length > 0) throw new SupervisorError("worktree: name exactly one directory, e.g. supervise worktree ../train", 2);
			const ids = (values.repos ?? "").split(",").map((id) => id.trim()).filter(Boolean);
			const plan = planWorktrees(context.root, context.topology, resolve(target), ids);
			createWorktrees(plan, { install: !values["no-install"] });
			console.log(`\nRun the train from there: pnpm supervise <command> --root ${resolve(target)}`);
			return 0;
		},
	},
};
