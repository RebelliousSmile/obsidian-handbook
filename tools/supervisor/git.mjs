/**
 * Read-only git observations.
 *
 * The supervisor never checks out, pulls, commits or pushes on its own. The
 * only command here that writes is `git fetch`, and it writes remote-tracking
 * refs, never the working tree or HEAD.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function git(cwd, args, options = {}) {
	const result = spawnSync("git", args, {
		cwd,
		encoding: "utf8",
		input: options.input,
		env: { ...process.env, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" },
		maxBuffer: 64 * 1024 * 1024,
	});
	if (result.error) throw result.error;
	return {
		status: result.status ?? 1,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	};
}

export function gitOut(cwd, args) {
	const result = git(cwd, args);
	if (result.status !== 0) {
		throw new Error(`git ${args.join(" ")} (${cwd}): ${result.stderr.trim()}`);
	}
	return result.stdout.trim();
}

export function isRepository(dir) {
	return existsSync(resolve(dir, ".git"));
}

export function fetchOrigin(dir) {
	return git(dir, ["fetch", "--quiet", "origin"]).status === 0;
}

export function revParse(dir, ref) {
	const result = git(dir, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
	return result.status === 0 ? result.stdout.trim() : null;
}

export function isAncestor(dir, ancestor, descendant) {
	return git(dir, ["merge-base", "--is-ancestor", ancestor, descendant]).status === 0;
}

/** Branch, cleanliness and distance to `origin/main`, without changing any of them. */
export function observeRepo(dir, { fetch = true } = {}) {
	if (!isRepository(dir)) return { present: false };
	const fetched = fetch ? fetchOrigin(dir) : null;
	const branch = gitOut(dir, ["branch", "--show-current"]) || null;
	const head = revParse(dir, "HEAD");
	const originMain = revParse(dir, "origin/main");
	const clean = gitOut(dir, ["status", "--porcelain"]) === "";
	let ahead = null;
	let behind = null;
	if (head && originMain) {
		const counts = gitOut(dir, ["rev-list", "--left-right", "--count", "HEAD...origin/main"]).split(/\s+/);
		ahead = Number(counts[0]);
		behind = Number(counts[1]);
	}
	return { present: true, fetched, branch, head, originMain, clean, ahead, behind };
}

/** Content of `path` at `ref`, or null when the path does not exist there. */
export function showFile(dir, ref, path) {
	const result = git(dir, ["show", `${ref}:${path}`]);
	return result.status === 0 ? result.stdout : null;
}

export function listTree(dir, ref, path) {
	const result = git(dir, ["ls-tree", "--name-only", `${ref}:${path}`]);
	return result.status === 0 ? result.stdout.split("\n").filter(Boolean) : [];
}

export function isTracked(dir, path) {
	return git(dir, ["ls-files", "--error-unmatch", "--", path]).status === 0;
}
