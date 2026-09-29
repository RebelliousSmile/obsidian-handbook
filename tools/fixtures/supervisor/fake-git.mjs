/**
 * A git that logs every call before delegating: proves which commands ran.
 *
 * Each call is appended to `FAKE_GIT_LOG`, then handed to the real git named
 * by `FAKE_GIT_REAL`, resolved once by the world outside its own `bin/`. The
 * supervisor reaches it through `SUPERVISOR_GIT`, a shell through the shims
 * of `bin/`.
 */
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const log = process.env.FAKE_GIT_LOG;
const real = process.env.FAKE_GIT_REAL;
if (!log || !real) {
	process.stderr.write("fake git: FAKE_GIT_LOG and FAKE_GIT_REAL must be set\n");
	process.exit(90);
}
const args = process.argv.slice(2);
appendFileSync(log, `${args.join(" ")}\n`);
const result = spawnSync(real, args, { stdio: "inherit" });
if (result.error) {
	process.stderr.write(`fake git: ${real} did not start: ${result.error.message}\n`);
	process.exit(127);
}
process.exit(result.status ?? 1);
