/**
 * A git that logs its call before delegating: the `git` of a world's `bin/`,
 * reached by a shell. The supervisor itself runs the real git, observed by
 * `GIT_TRACE` (see `world.gitCalls()`), and the effect of a pushed tag is a
 * `post-receive` hook of the remotes (`apply-tag-effect.mjs`): a node wrapper
 * around each of the hundreds of git calls of a `ship` made it the most of the
 * harness time.
 *
 * Each call is appended to `FAKE_GIT_LOG` when set, then handed to the real git
 * named by `FAKE_GIT_REAL`, resolved once by the world outside its own `bin/`.
 */
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const log = process.env.FAKE_GIT_LOG;
const real = process.env.FAKE_GIT_REAL;
if (!real) {
	process.stderr.write("fake git: FAKE_GIT_REAL must be set\n");
	process.exit(90);
}
const args = process.argv.slice(2);
if (log) appendFileSync(log, `${args.join(" ")}\n`);
const result = spawnSync(real, args, { stdio: "inherit" });
if (result.error) {
	process.stderr.write(`fake git: ${real} did not start: ${result.error.message}\n`);
	process.exit(127);
}
process.exit(result.status ?? 1);
