/**
 * Freshness of a sibling checkout (`../lantern`, `../schema-*`). Some gates read
 * those checkouts as they are; one that lags `origin/main` turns a gate red (or
 * green) for a reason that has nothing to do with the code under test.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

function git(dir, args) {
	const result = spawnSync("git", ["-C", dir, ...args], { encoding: "utf8" });
	return { ok: result.status === 0, out: (result.stdout ?? "").trim() };
}

/** How far `dir` lags its upstream. `null` when it cannot be told (not a repository, no remote, offline). */
export function siblingLag(dir, { fetch = true } = {}) {
	if (!existsSync(dir) || !git(dir, ["rev-parse", "--git-dir"]).ok) return null;
	if (fetch && !git(dir, ["fetch", "--quiet", "origin"]).ok) return null;
	const branch = git(dir, ["symbolic-ref", "--short", "HEAD"]);
	if (!branch.ok) return null;
	const behind = git(dir, ["rev-list", "--count", `HEAD..origin/${branch.out}`]);
	return behind.ok ? { branch: branch.out, behind: Number(behind.out) } : null;
}

/** The refusal text for a lagging sibling, or `null` when it is current or unknowable. */
export function siblingLagProblem(name, dir, options) {
	const lag = siblingLag(dir, options);
	if (!lag || lag.behind === 0) return null;
	return `${name} is ${lag.behind} commit${lag.behind === 1 ? "" : "s"} behind origin/${lag.branch}: run \`git -C ${dir} pull --ff-only\` before trusting this gate`;
}

export function assertSiblingsFresh(names, root) {
	const problems = names.map((name) => siblingLagProblem(name, `${root}/../${name}`)).filter(Boolean);
	if (problems.length > 0) throw new Error(problems.join("\n"));
}
