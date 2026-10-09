/**
 * Stopping what `supervise preview` starts.
 *
 * A dev server is a process that starts others (vite's workers, a watcher).
 * `child.kill()` ends the direct child only, and on Windows nothing ends the
 * rest: the processes outlive the command and keep their memory. A server is
 * therefore stopped as a whole tree, and its pid is recorded in the git
 * directory of the checkout it serves (local, never committed) so that the next
 * preview ends the servers an interrupted one left behind.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const WINDOWS = process.platform === "win32";

/** Whether a process with this pid exists. */
export function isAlive(pid) {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return error?.code === "EPERM";
	}
}

/** Stop a process and everything it started. A tree that is already gone is not an error. */
export function stopTree(pid) {
	if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) return;
	if (WINDOWS) {
		spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
		return;
	}
	try {
		process.kill(-pid, "SIGTERM");
	} catch {
		try {
			process.kill(pid, "SIGTERM");
		} catch {
			// already gone
		}
	}
}

/** The command line of a process, or null when it cannot be read: such a process is never stopped. */
export function commandLine(pid) {
	const result = WINDOWS
		? spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", `(Get-CimInstance Win32_Process -Filter "ProcessId=${Number(pid)}").CommandLine`], { encoding: "utf8" })
		: spawnSync("ps", ["-p", String(Number(pid)), "-o", "command="], { encoding: "utf8" });
	const line = (result.stdout ?? "").trim();
	return result.status === 0 && line ? line : null;
}

function readRegistry(file) {
	try {
		const pids = JSON.parse(readFileSync(file, "utf8")).pids;
		return Array.isArray(pids) ? pids.filter((pid) => Number.isInteger(pid)) : [];
	} catch {
		return [];
	}
}

/** Record the servers a preview started. */
export function recordServers(file, pids) {
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, `${JSON.stringify({ pids })}\n`);
}

export function clearServers(file) {
	rmSync(file, { force: true });
}

/**
 * Stop the servers a previous preview recorded and left running. A pid is
 * stopped only when its command line names `marker`: a pid since reused by
 * another program is left alone. Returns the pids it stopped.
 */
export function reapServers(file, marker, { stop = stopTree, read = commandLine } = {}) {
	if (!existsSync(file)) return [];
	const stopped = [];
	for (const pid of readRegistry(file)) {
		if (!isAlive(pid)) continue;
		const line = read(pid);
		if (line === null || !line.includes(marker)) continue;
		stop(pid);
		stopped.push(pid);
	}
	clearServers(file);
	return stopped;
}
