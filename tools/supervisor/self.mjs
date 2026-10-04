/**
 * The supervisor only acts as the code a person published.
 *
 * It commits and pushes in every repository of the train, so a change to its
 * own code is a change to what it may do. Before any command but `status`,
 * its code in the checkout must be the one on `origin/main`: an edit that
 * was not committed and pushed by a person can neither run a write nor land
 * itself through `commit`.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { git, isRepository, revParse, showFile } from "./git.mjs";
import { TRAINS_PATH } from "./train.mjs";
import { coordinatorOf, HANDBOOK_ROOT, repoDir, SupervisorError } from "./topology.mjs";

/** What decides the supervisor's behaviour; the train records are data, not code. */
export const SELF_PATHS = ["tools/supervise.mjs", "tools/supervisor", "supervisor"];
const SELF_SCRIPT = "supervise";

function pathspec() {
	return ["--", ...SELF_PATHS, `:(exclude)${TRAINS_PATH}`];
}

function samePath(a, b) {
	return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function script(text) {
	if (text === null) return undefined;
	try {
		return JSON.parse(text).scripts?.[SELF_SCRIPT];
	} catch {
		return null;
	}
}

/** Every way the supervisor's code in `dir` differs from `origin/main`. */
export function selfDrift(dir) {
	if (!isRepository(dir)) return [];
	if (!revParse(dir, "origin/main")) return ["origin/main is unknown"];
	const drift = [];
	const status = git(dir, ["status", "--porcelain", "--untracked-files=all", ...pathspec()]).stdout;
	for (const line of status.split("\n")) if (line.trim()) drift.push(`${line.slice(3)} (not committed)`);
	const unpublished = git(dir, ["diff", "--name-only", "origin/main", "HEAD", ...pathspec()]).stdout;
	for (const line of unpublished.split("\n")) if (line.trim()) drift.push(`${line.trim()} (committed, not on origin/main)`);
	const manifest = resolve(dir, "package.json");
	const working = script(existsSync(manifest) ? readFileSync(manifest, "utf8") : null);
	if (working !== script(showFile(dir, "origin/main", "package.json"))) drift.push(`package.json: the "${SELF_SCRIPT}" script`);
	return drift;
}

/** The coordinator of this root, and the checkout this code runs from when the root holds it. */
function selfDirs(root, topology) {
	const dirs = [repoDir(root, coordinatorOf(topology))];
	const running = resolve(HANDBOOK_ROOT);
	if (topology.repos.some((repo) => samePath(repoDir(root, repo), running)) && !dirs.some((dir) => samePath(dir, running))) dirs.push(running);
	return dirs;
}

export function assertSelfPublished(root, topology) {
	const problems = [];
	for (const dir of selfDirs(root, topology)) {
		for (const entry of selfDrift(dir)) problems.push(`${dir}: ${entry}`);
	}
	if (problems.length === 0) return;
	throw new SupervisorError(
		`the supervisor's own code differs from origin/main\n  ${problems.join("\n  ")}\n  a person commits and pushes it first: the supervisor neither runs nor lands a change to itself`,
		1,
	);
}
