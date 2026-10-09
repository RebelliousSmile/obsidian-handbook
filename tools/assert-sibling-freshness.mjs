import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { siblingLag, siblingLagProblem } from "./siblingFreshness.mjs";

const work = mkdtempSync(join(tmpdir(), "sibling-freshness-"));
const git = (dir, ...args) => {
	const r = spawnSync("git", ["-C", dir, "-c", "user.name=t", "-c", "user.email=t@t", ...args], { encoding: "utf8" });
	assert.equal(r.status, 0, r.stderr);
};
const commit = (dir, name) => {
	writeFileSync(join(dir, name), name);
	git(dir, "add", ".");
	git(dir, "commit", "-q", "-m", name);
};
try {
	const origin = join(work, "origin");
	const clone = join(work, "clone");
	git(work, "init", "-q", "-b", "main", origin);
	commit(origin, "a");
	git(work, "clone", "-q", origin, clone);

	assert.deepEqual(siblingLag(clone), { branch: "main", behind: 0 }, "a current clone is not behind");
	assert.equal(siblingLagProblem("schema-x", clone), null);

	commit(origin, "b");
	commit(origin, "c");
	assert.equal(siblingLag(clone, { fetch: false })?.behind, 0, "without a fetch the lag is not seen");
	assert.equal(siblingLag(clone)?.behind, 2, "a fetch reveals two new commits");
	const problem = siblingLagProblem("schema-x", clone);
	assert.match(problem, /schema-x is 2 commits behind origin\/main/);
	assert.match(problem, /pull --ff-only/);

	assert.equal(siblingLag(join(work, "absent")), null, "a missing directory is not a lag");
	assert.equal(siblingLag(work), null, "a non-repository is not a lag");
	rmSync(origin, { recursive: true, force: true });
	assert.equal(siblingLag(clone), null, "an unreachable remote is not a lag");
	console.log("Sibling freshness assertions passed.");
} finally {
	rmSync(work, { recursive: true, force: true });
}
