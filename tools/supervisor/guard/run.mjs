/**
 * Entry point of the guard's PATH shims: `node run.mjs <gh|git> <args...>`.
 *
 * Applies the guard rules, then hands the call to the real binary found on
 * the PATH outside this directory. Fails closed: a refused call exits 97, a
 * missing real binary exits 127, and neither ever reaches a binary.
 */
import { createRequire } from "module";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { findExecutable, spawnCommand } from "../spawn.mjs";

const require = createRequire(import.meta.url);
const { guardRefusal } = require("./rules.cjs");

const guardDir = dirname(fileURLToPath(import.meta.url));
const [tool, ...args] = process.argv.slice(2);

if (tool !== "gh" && tool !== "git") {
	process.stderr.write(`supervisor guard: unknown tool "${tool ?? ""}"\n`);
	process.exit(127);
}

const refused = guardRefusal(tool, args);
if (refused) {
	process.stderr.write(`${refused}\n`);
	process.exit(97);
}

if (!findExecutable(tool, { exclude: [guardDir] })) {
	process.stderr.write(`supervisor guard: no ${tool} outside ${guardDir}\n`);
	process.exit(127);
}

const run = spawnCommand(tool, args, { exclude: [guardDir], stdio: "inherit" });
if (run.error) {
	process.stderr.write(`supervisor guard: ${tool} did not start: ${run.error.message}\n`);
	process.exit(127);
}
process.exit(run.status ?? 1);
