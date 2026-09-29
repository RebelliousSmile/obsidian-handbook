/**
 * Launch a local command the same way on Windows and on POSIX.
 *
 * Without a shell, Node only finds `.exe` files on Windows, and since
 * CVE-2024-27980 it refuses to spawn a `.cmd` or `.bat` directly (EINVAL).
 * `npm`, `pnpm` and every `node_modules/.bin` entry are `.cmd` shims there, so
 * a validation such as `npm run check` never started. `spawnCommand` resolves
 * the name on the PATH with PATHEXT and runs a batch file through
 * `cmd.exe /d /s /c`, with the argument escaping of cross-spawn.
 */
import { spawnSync } from "child_process";
import { accessSync, constants, statSync } from "fs";
import { delimiter, isAbsolute, join, resolve } from "path";

const WINDOWS = process.platform === "win32";
const META = /([()\][%!^"`<>&|;, *?])/g;

/** The environment key holding the PATH: `Path` on Windows, `PATH` elsewhere. */
export function pathKey(env = process.env) {
	if (!WINDOWS) return "PATH";
	return Object.keys(env).find((key) => key.toUpperCase() === "PATH") ?? "Path";
}

function sameDir(a, b) {
	const clean = (dir) => resolve(dir).replace(/[\\/]+$/, "");
	return WINDOWS ? clean(a).toLowerCase() === clean(b).toLowerCase() : clean(a) === clean(b);
}

function isFile(file) {
	try {
		if (!statSync(file).isFile()) return false;
		if (!WINDOWS) accessSync(file, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

/**
 * Resolve `name` to a file, or null. A name holding a path separator is taken
 * as is. `exclude` lists directories skipped on the PATH (the guard's own).
 */
export function findExecutable(name, { env = process.env, exclude = [] } = {}) {
	const extensions = WINDOWS ? (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean) : [""];
	const candidates = (base) =>
		WINDOWS && !/\.[^\\/.]+$/.test(base) ? extensions.map((ext) => base + ext) : [base];
	if (isAbsolute(name) || /[\\/]/.test(name)) {
		return candidates(resolve(name)).find(isFile) ?? null;
	}
	const dirs = (env[pathKey(env)] ?? "").split(delimiter).filter(Boolean);
	for (const dir of dirs) {
		if (exclude.some((skipped) => sameDir(dir, skipped))) continue;
		const found = candidates(join(dir, name)).find(isFile);
		if (found) return found;
	}
	return null;
}

/**
 * `--require "<file>"` for NODE_OPTIONS, appended to what is already there.
 * Node reads NODE_OPTIONS with escapes: a bare Windows path inside quotes
 * loses its backslashes (`C:\Users` becomes `C:Users`).
 */
export function withRequire(nodeOptions, file) {
	const option = `--require "${file.replace(/[\\"]/g, "\\$&")}"`;
	return nodeOptions ? `${nodeOptions} ${option}` : option;
}

function escapeArgument(argument, twice) {
	let escaped = String(argument)
		.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"')
		.replace(/(?=(\\+?)?)\1$/, "$1$1");
	escaped = `"${escaped}"`.replace(META, "^$1");
	return twice ? escaped.replace(META, "^$1") : escaped;
}

/** The `cmd.exe` argument vector that runs a batch file with `args`. */
export function batchInvocation(file, args) {
	// node_modules/.bin shims hand their arguments to a second cmd parse.
	const twice = /node_modules[\\/]\.bin[\\/][^\\/]+\.cmd$/i.test(file);
	const line = [file.replace(META, "^$1"), ...args.map((argument) => escapeArgument(argument, twice))].join(" ");
	return ["/d", "/s", "/c", `"${line}"`];
}

/**
 * spawnSync with PATH resolution and batch files handled. A command that is
 * not found yields status 127 and a message naming it, never a raw ENOENT.
 */
export function spawnCommand(command, args = [], options = {}) {
	const { exclude = [], ...spawnOptions } = options;
	const env = spawnOptions.env ?? process.env;
	const file = findExecutable(command, { env, exclude });
	if (!file) {
		const message = `supervisor: command not found: ${command}\n`;
		const inherit = spawnOptions.stdio === "inherit";
		if (inherit) process.stderr.write(message);
		const text = spawnOptions.encoding && spawnOptions.encoding !== "buffer";
		const stderr = inherit ? null : text ? message : Buffer.from(message);
		const stdout = inherit ? null : text ? "" : Buffer.alloc(0);
		return { pid: 0, status: 127, signal: null, stdout, stderr, output: [null, stdout, stderr] };
	}
	if (WINDOWS && /\.(cmd|bat)$/i.test(file)) {
		return spawnSync(env.ComSpec ?? process.env.ComSpec ?? "cmd.exe", batchInvocation(file, args), {
			...spawnOptions,
			windowsVerbatimArguments: true,
		});
	}
	return spawnSync(file, args, spawnOptions);
}
