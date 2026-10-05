/**
 * What GitHub does when a tag reaches a repository: `post-receive` hooks of the
 * bare remotes of a world run this with the repository directory name and the
 * tag.
 *
 * The next queued effect of `tagEffects["<repository directory> <tag>"]` in the
 * fake GitHub state (`FAKE_GH_STATE`) starts a run of its `workflow` in its
 * `repository` on the tag, ending in `conclusion` (success by default), and a
 * successful run publishes its `createRelease`. An effect with a `status`
 * leaves the run open: `fake-gh.mjs` completes it on a later `run view`, from
 * the same queue.
 *
 * A push that carries no `FAKE_GH_STATE` is the harness setting a world up, not
 * the supervisor: nothing happens.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const statePath = process.env.FAKE_GH_STATE;
const [name, tag] = process.argv.slice(2);
if (statePath && name && tag && existsSync(statePath)) {
	const state = JSON.parse(readFileSync(statePath, "utf8"));
	const effect = ((state.tagEffects ?? {})[`${name} ${tag}`] ?? []).shift();
	if (effect) {
		const repo = effect.repository;
		state.runs = state.runs ?? {};
		state.runs[repo] = state.runs[repo] ?? [];
		const id = 1000 + Object.keys(state.runs).reduce((count, key) => count + state.runs[key].length, 0);
		const conclusion = effect.status ? null : effect.conclusion ?? "success";
		state.runs[repo].unshift({
			databaseId: id,
			workflowName: effect.workflow,
			headBranch: tag,
			status: effect.status ?? "completed",
			conclusion,
			effects: ["tagEffects", `${name} ${tag}`],
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
