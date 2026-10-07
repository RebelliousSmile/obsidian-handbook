/**
 * Where a train keeps the whole output of its commands, and how long each took.
 *
 * Both live in the git directory of the coordinator, outside the checkout and
 * never committed:
 *   - `supervisor-logs/<train>/<repo>-<rank>-<step>.log`: the whole output of
 *     one command. The name carries no text of the command, so it is valid on
 *     every OS and stable from one run to the next, which overwrites it;
 *   - `supervisor-logs/<train>.durations.jsonl`: one JSON object per line, for
 *     each command, each step of `ship` and each `ship` cycle.
 *
 * `close --run` removes the logs and keeps the durations. No path of this
 * module is ever written to a train record: a record is committed, and these
 * paths are local.
 */
import { appendFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { git } from "./git.mjs";
import { runGuarded } from "./guarded.mjs";
import { coordinatorOf, repoDir } from "./topology.mjs";

/** "0.4 s", "12.3 s", "3 min 12 s". */
export function formatDuration(ms) {
	if (!Number.isFinite(ms)) return "?";
	if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
	const seconds = Math.round(ms / 1000);
	return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

/** "14:03:27", local time. */
export function clock(date = new Date()) {
	return [date.getHours(), date.getMinutes(), date.getSeconds()].map((part) => String(part).padStart(2, "0")).join(":");
}

function gitDirectory(root, topology) {
	try {
		const result = git(repoDir(root, coordinatorOf(topology)), ["rev-parse", "--absolute-git-dir"]);
		return result.status === 0 ? result.stdout.trim() : null;
	} catch {
		return null;
	}
}

/**
 * The logs of one train. Without a git directory to keep them in, nothing is
 * written and every command still runs.
 */
export function trainLogs(root, topology, trainId) {
	const base = gitDirectory(root, topology);
	const dir = base ? resolve(base, "supervisor-logs", trainId) : null;
	const durations = base ? resolve(base, "supervisor-logs", `${trainId}.durations.jsonl`) : null;
	const ranks = new Map();

	const logs = {
		dir,
		durations,
		/** The log of the command of rank `rank` (from 1) of `step` in `repo`; null when nothing is kept. */
		file(repo, rank, step) {
			return dir ? resolve(dir, `${repo}-${rank}-${step}.log`) : null;
		},
		/** One line of the durations summary. */
		record(entry) {
			if (!durations) return;
			try {
				mkdirSync(dirname(durations), { recursive: true });
				appendFileSync(durations, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
			} catch {
				// A summary that cannot be written never fails the command it measures.
			}
		},
		/** `runGuarded`, its whole output kept and its duration recorded. Ranks restart with each `trainLogs`. */
		run(repo, step, cwd, command, label) {
			const key = `${repo}\0${step}`;
			const rank = (ranks.get(key) ?? 0) + 1;
			ranks.set(key, rank);
			const result = runGuarded(cwd, command, label, { log: logs.file(repo, rank, step) });
			logs.record({ kind: "command", repo, step, command, status: result.status, durationMs: result.durationMs });
			return result;
		},
		/** Remove the logs; the durations summary stays. */
		purge() {
			if (dir) rmSync(dir, { recursive: true, force: true });
		},
	};
	return logs;
}

/** What an error says after a red command: where its whole output is. */
export function logNote(result) {
	return result.log ? `\nWhole output: ${result.log}` : "";
}
