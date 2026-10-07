/**
 * Running a command behind the publication guard.
 *
 * `guard/` is a PATH prefix whose gh and git refuse to publish, and a hook
 * preloaded in every Node child. A validation, a build or a dev server run
 * through here cannot release, push, tag or dispatch a workflow, even by
 * mistake. Every command that runs repository code goes through this module.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pathKey, spawnCommand, withRequire } from "./spawn.mjs";

export const GUARD_DIR = fileURLToPath(new URL("./guard", import.meta.url));

const TAIL = 30;

/**
 * The environment of a guarded validation. The guard leads the PATH, under
 * the key the environment already uses (`Path` on Windows), so a shell call
 * meets its shims; its hook is preloaded in every Node child, so a Node tool
 * spawning gh or git without a shell is refused too.
 */
export function guardedEnv(env = process.env) {
	const key = pathKey(env);
	const next = {};
	for (const [name, value] of Object.entries(env)) {
		if (name.toUpperCase() !== "PATH" || name === key) next[name] = value;
	}
	const rest = (env[key] ?? "").split(delimiter).filter((dir) => dir && resolve(dir) !== resolve(GUARD_DIR));
	next[key] = [GUARD_DIR, ...rest].join(delimiter);
	next.NODE_OPTIONS = withRequire(env.NODE_OPTIONS, join(GUARD_DIR, "hook.cjs"));
	next.SUPERVISOR_PRESENT = "1";
	return next;
}

/**
 * The inverse of `guardedEnv`: the guard's PATH entry, its hook and the
 * present marker removed, everything else kept. Only for the supervisor
 * harnesses, run by `pnpm check` behind the guard of a real `present`: their
 * worlds push to bare remotes in a temporary directory and talk to a fake gh,
 * and they prove the guard from a baseline where it is absent.
 */
export function unguardedEnv(env = process.env) {
	const key = pathKey(env);
	const next = {};
	for (const [name, value] of Object.entries(env)) {
		if (name.toUpperCase() !== "PATH" || name === key) next[name] = value;
	}
	next[key] = (env[key] ?? "").split(delimiter).filter((dir) => dir && resolve(dir) !== resolve(GUARD_DIR)).join(delimiter);
	const hook = withRequire(undefined, join(GUARD_DIR, "hook.cjs"));
	const options = (env.NODE_OPTIONS ?? "").split(hook).join("").trim().replace(/\s+/g, " ");
	if (options) next.NODE_OPTIONS = options;
	else delete next.NODE_OPTIONS;
	delete next.SUPERVISOR_PRESENT;
	return next;
}

/**
 * Run `command` in `dir` behind the publication guard. The result keeps the
 * last lines of its output and its duration; with `log`, the whole output is
 * written to that file, which the caller names (`logs.mjs`): this module knows
 * neither the train nor the coordinator. Without `log`, nothing is written.
 */
export function runGuarded(dir, command, label, { log = null } = {}) {
	process.stderr.write(`${label}: ${command.join(" ")} in ${dir}\n`);
	const started = Date.now();
	// The command itself is resolved past the guard's own shims.
	const result = spawnCommand(command[0], command.slice(1), {
		cwd: dir,
		encoding: "utf8",
		env: guardedEnv(),
		exclude: [GUARD_DIR],
		maxBuffer: 256 * 1024 * 1024,
	});
	const durationMs = Date.now() - started;
	const output = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`;
	let written = null;
	if (log) {
		try {
			mkdirSync(dirname(log), { recursive: true });
			writeFileSync(log, output);
			written = log;
		} catch {
			// A log that cannot be written never changes the result of the command.
		}
	}
	return {
		command,
		status: result.error ? 127 : (result.status ?? 1),
		tail: output.trimEnd().split("\n").slice(-TAIL).join("\n"),
		durationMs,
		log: written,
	};
}
