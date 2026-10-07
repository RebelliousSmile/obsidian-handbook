/**
 * A stand-in for `npm run <script>`, `npm ci` and `pnpm install`: the local
 * release-train steps of a provider, and the install of a consumer adopting
 * an archive.
 *
 * Every call is appended to `localCalls` of the fake GitHub state
 * (`FAKE_GH_STATE`), with its arguments and working directory. The next
 * queued effect of `localEffects["<repository directory> <script>"]` decides
 * its exit status (the script of an install is `install` or `ci`, whatever
 * its flags), and may publish a release in the same fake GitHub, which
 * is what a local promotion does, or write a file of the checkout, as a
 * convergence writes its evidence. `--output <file>` is written, as the
 * assertion writes its provenance.
 *
 * `npm pack --dry-run --json` (script `pack`) lists what the package of the
 * working directory publishes: `package.json` and the entries of its `files`,
 * or the whole directory without that field. Like a `prepack` script, it
 * writes a line on the standard output before the JSON.
 *
 * `npm run validate:release-train -- <manifest>` reads the manifest it is
 * given, as the validation of a provider does: a green one that finds no
 * readable JSON at that path of the working directory exits 93.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/** The files under `path` (relative to the working directory), a file or a directory. */
function walk(path, found = []) {
	const full = join(process.cwd(), path);
	if (!existsSync(full)) return found;
	if (!statSync(full).isDirectory()) {
		found.push(path.split("\\").join("/"));
		return found;
	}
	for (const entry of readdirSync(full)) {
		if (entry === ".git" || entry === "node_modules") continue;
		walk(path === "." ? entry : join(path, entry), found);
	}
	return found;
}

const statePath = process.env.FAKE_GH_STATE;
if (!statePath) {
	process.stderr.write("fake npm: FAKE_GH_STATE is not set\n");
	process.exit(90);
}
const state = JSON.parse(readFileSync(statePath, "utf8"));
const args = process.argv.slice(2);
state.localCalls = [...(state.localCalls ?? []), { args, cwd: process.cwd() }];

if (args[0] === "pack" && args.includes("--dry-run") && args.includes("--json")) {
	const effect = ((state.localEffects ?? {})[`${basename(process.cwd())} pack`] ?? []).shift() ?? {};
	writeFileSync(statePath, JSON.stringify(state, null, "\t"));
	const status = effect.status ?? 0;
	if (status !== 0) {
		process.stderr.write(`fake npm: prepack exited ${status}\n`);
		process.exit(status);
	}
	const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
	const entries = Array.isArray(manifest.files) ? ["package.json", ...manifest.files] : ["."];
	const files = [...new Set(entries.reduce((found, entry) => walk(entry, found), []))];
	process.stdout.write("fake npm: prepack wrote its files\n[not the listing]\n");
	process.stdout.write(`${JSON.stringify([{ name: manifest.name, version: manifest.version, files: files.map((path) => ({ path })) }], null, 2)}\n`);
	process.exit(0);
}

const install = args[0] === "install" || args[0] === "ci";
// `pnpm <script>` is pnpm's shorthand for `pnpm run <script>`.
const shorthand = !install && args[0] !== "run" && /^[a-z][\w:-]*$/.test(args[0] ?? "");
if (!install && !shorthand && (args[0] !== "run" || !args[1])) {
	writeFileSync(statePath, JSON.stringify(state, null, "\t"));
	process.stderr.write(`fake npm: unsupported command ${args.join(" ")}\n`);
	process.exit(91);
}
const script = install || shorthand ? args[0] : args[1];
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
if (status === 0 && script === "validate:release-train") {
	const manifest = args[args.indexOf("--") + 1] ?? "";
	try {
		JSON.parse(readFileSync(join(process.cwd(), manifest), "utf8"));
	} catch {
		process.stderr.write(`fake npm: ${manifest} is not a readable manifest\n`);
		process.exit(93);
	}
}
process.stdout.write(`fake npm: ${script} exited ${status}\n`);
process.exit(status);
