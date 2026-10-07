/**
 * The rehearsal of a release-train manifest: what the train workflow of a
 * provider checks before it starts a host, played here first, so that an
 * invalid manifest costs seconds instead of a dispatch and a red run.
 *
 * The supervisor knows no script of a provider. A provider declares its
 * `rehearsal` in the topology, a list of commands where `{manifest}` stands
 * for the path of the manifest; its adapter marks the steps a rehearsal comes
 * before (`step.rehearse`: that path, and the commit the workflow is given).
 * Without either, nothing is rehearsed and the step runs as it always did.
 *
 * Two things are checked, both of them static:
 *   - the commit the workflow is given is an ancestor of origin/main, as the
 *     workflow itself requires;
 *   - each command is green, behind the publication guard, on the manifest as
 *     the step will land it: written in the checkout, never committed, then
 *     taken out again whatever the commands did. The step that lands it writes
 *     it again itself, on a clean checkout.
 *
 * What a host proves (the plugin loaded in Obsidian) stays in the workflow.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { git, isAncestor } from "./git.mjs";
import { readyCheckout } from "./land.mjs";
import { formatDuration, logNote, trainLogs } from "./logs.mjs";
import { MANIFEST_TOKEN, SupervisorError } from "./topology.mjs";

/** The step the logs and durations of a rehearsal are filed under. */
const REHEARSE_STEP = "rehearse";

/** The commands `repo` rehearses before `step`, its manifest path in place of the token; none for a step no rehearsal comes before. */
export function rehearsalCommands(repo, step) {
	if (!step.rehearse) return [];
	return (repo.rehearsal ?? []).map((command) => command.map((argument) => argument.split(MANIFEST_TOKEN).join(step.rehearse.path)));
}

function changes(dir) {
	return git(dir, ["status", "--porcelain", "--untracked-files=all"]).stdout.replace(/\s+$/, "");
}

/**
 * Rehearse `step` in the checkout of `repo`, and return only when it may run.
 * A red command, a commit origin/main does not descend from, or a rehearsal
 * that leaves the checkout changed stops the publication: nothing was landed
 * or dispatched yet.
 */
export function rehearse(root, topology, trainId, repo, dir, step) {
	const commands = rehearsalCommands(repo, step);
	if (commands.length === 0) return;
	const { path, commit } = step.rehearse;
	readyCheckout(repo, dir, "publish");
	if (git(dir, ["cat-file", "-e", `${commit}^{commit}`]).status !== 0 || !isAncestor(dir, commit, "origin/main")) {
		throw new SupervisorError(`publish: ${repo.id}: origin/main does not descend from ${commit.slice(0, 10)}, the commit its train workflow is given; nothing was landed or dispatched`, 1);
	}

	// A step that lands the manifest rehearses the content it is about to land; a later step finds it committed.
	const content = step.type === "land" ? step.files?.[path] : undefined;
	const tracked = git(dir, ["cat-file", "-e", `HEAD:${path}`]).status === 0;
	const logs = trainLogs(root, topology, trainId);
	let failed = null;
	let elapsed = 0;
	try {
		if (content !== undefined) {
			mkdirSync(dirname(resolve(dir, path)), { recursive: true });
			writeFileSync(resolve(dir, path), content);
		}
		for (const command of commands) {
			const result = logs.run(repo.id, REHEARSE_STEP, dir, command, "publish");
			elapsed += result.durationMs ?? 0;
			if (result.status !== 0) {
				failed = result;
				break;
			}
		}
	} finally {
		if (content !== undefined) {
			if (tracked) git(dir, ["checkout", "HEAD", "--", path]);
			else rmSync(resolve(dir, path), { force: true });
		}
	}

	const left = changes(dir);
	const leftNote = left ? `\nThe rehearsal left changes in ${dir}:\n  ${left.split("\n").join("\n  ")}` : "";
	if (failed) {
		throw new SupervisorError(`publish: the rehearsal of ${path} is red in ${repo.id}: \`${failed.command.join(" ")}\` exited ${failed.status}; nothing was landed or dispatched${leftNote}\n${failed.tail}${logNote(failed)}`, 1);
	}
	if (left) {
		throw new SupervisorError(`publish: the rehearsal of ${path} is green in ${repo.id}, but it changed the checkout; nothing was landed or dispatched${leftNote}`, 1);
	}
	console.log(`${repo.id}: rehearsed ${path}: ${commands.length} command(s) green in ${formatDuration(elapsed)}`);
}
