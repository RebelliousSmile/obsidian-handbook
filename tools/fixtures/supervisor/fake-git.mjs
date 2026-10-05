/**
 * A git that logs every call before delegating: proves which commands ran.
 *
 * Each call is appended to `FAKE_GIT_LOG`, then handed to the real git named
 * by `FAKE_GIT_REAL`, resolved once by the world outside its own `bin/`. The
 * supervisor reaches it through `SUPERVISOR_GIT`, a shell through the shims
 * of `bin/`.
 *
 * A push of `refs/tags/<tag>` that succeeds plays what GitHub does on that
 * push: the next queued effect of `tagEffects["<repository directory> <tag>"]`
 * in the fake GitHub state (`FAKE_GH_STATE`) starts a run of its `workflow`
 * in its `repository` on the tag, ending in `conclusion` (success by
 * default), and a successful run publishes its `createRelease`. An effect with
 * a `status` leaves the run open: `fake-gh.mjs` completes it on a later
 * `run view`, from the same queue.
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

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
const statePath = process.env.FAKE_GH_STATE;
if (result.status === 0 && args[0] === "push" && statePath && existsSync(statePath)) {
	const tags = args.map((arg) => /:refs\/tags\/(.+)$/.exec(arg)?.[1]).filter(Boolean);
	const state = JSON.parse(readFileSync(statePath, "utf8"));
	for (const tag of tags) {
		const effect = ((state.tagEffects ?? {})[`${basename(process.cwd())} ${tag}`] ?? []).shift();
		if (!effect) continue;
		const repo = effect.repository;
		state.runs = state.runs ?? {};
		state.runs[repo] = state.runs[repo] ?? [];
		const id = 1000 + Object.keys(state.runs).reduce((count, name) => count + state.runs[name].length, 0);
		const conclusion = effect.status ? null : effect.conclusion ?? "success";
		state.runs[repo].unshift({
			databaseId: id,
			workflowName: effect.workflow,
			headBranch: tag,
			status: effect.status ?? "completed",
			conclusion,
			effects: ["tagEffects", `${basename(process.cwd())} ${tag}`],
			inputs: {},
			createdAt: new Date(Date.UTC(2026, 8, 29, 12, 0, id - 1000)).toISOString(),
			url: `https://github.com/${repo}/actions/runs/${id}`,
			artifacts: [],
		});
		if (conclusion === "success" && effect.createRelease) {
			state.releases = state.releases ?? {};
			state.releases[repo] = [effect.createRelease, ...(state.releases[repo] ?? [])];
		}
	}
	writeFileSync(statePath, JSON.stringify(state, null, "\t"));
}
process.exit(result.status ?? 1);
