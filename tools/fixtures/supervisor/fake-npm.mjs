/**
 * A stand-in for `npm run <script>` in a provider checkout, for the local
 * release-train steps of schema-in-the-mist.
 *
 * Every call is appended to `localCalls` of the fake GitHub state
 * (`FAKE_GH_STATE`), with its arguments and working directory. The next
 * queued effect of `localEffects["<repository directory> <script>"]` decides
 * its exit status, and may publish a release in the same fake GitHub, which
 * is what a local promotion does, or write a file of the checkout, as a
 * convergence writes its evidence. `--output <file>` is written, as the
 * assertion writes its provenance.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const statePath = process.env.FAKE_GH_STATE;
if (!statePath) {
	process.stderr.write("fake npm: FAKE_GH_STATE is not set\n");
	process.exit(90);
}
const state = JSON.parse(readFileSync(statePath, "utf8"));
const args = process.argv.slice(2);
state.localCalls = [...(state.localCalls ?? []), { args, cwd: process.cwd() }];

if (args[0] !== "run" || !args[1]) {
	writeFileSync(statePath, JSON.stringify(state, null, "\t"));
	process.stderr.write(`fake npm: unsupported command ${args.join(" ")}\n`);
	process.exit(91);
}
const script = args[1];
const effect = ((state.localEffects ?? {})[`${basename(process.cwd())} ${script}`] ?? []).shift() ?? {};
const status = effect.status ?? 0;
if (status === 0) {
	const output = args.indexOf("--output");
	if (output >= 0) {
		mkdirSync(dirname(args[output + 1]), { recursive: true });
		writeFileSync(args[output + 1], `${JSON.stringify({ script, args: args.slice(2) }, null, "\t")}\n`);
	}
	if (effect.write) {
		mkdirSync(dirname(join(process.cwd(), effect.write.path)), { recursive: true });
		writeFileSync(join(process.cwd(), effect.write.path), effect.write.content);
	}
	if (effect.createRelease) {
		state.releases = state.releases ?? {};
		state.releases[effect.repository] = [effect.createRelease, ...(state.releases[effect.repository] ?? [])];
	}
}
writeFileSync(statePath, JSON.stringify(state, null, "\t"));
process.stdout.write(`fake npm: ${script} exited ${status}\n`);
process.exit(status);
