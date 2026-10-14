// Local loop for a schema-* provider: reads a checkout and installs it in a
// test vault through Handbook's own installer, then watches for changes.
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const VALUE_FLAGS = ["--source", "--vault", "--config-dir"];

function argument(name) {
	const index = process.argv.indexOf(name);
	if (index !== -1) return process.argv[index + 1] ?? null;
	const assignment = process.argv.find((value) => value.startsWith(`${name}=`));
	return assignment ? assignment.slice(name.length + 1) : null;
}

function positionalArguments() {
	const values = [];
	for (let index = 2; index < process.argv.length; index += 1) {
		const value = process.argv[index];
		if (VALUE_FLAGS.includes(value)) {
			index += 1;
			continue;
		}
		if (value.startsWith("--")) continue;
		values.push(value);
	}
	return values;
}

function fail(message) {
	console.error(`dev:schema: ${message}`);
	process.exit(1);
}

const sourceArgument = argument("--source");
const vaultArgument = argument("--vault") ?? positionalArguments()[0] ?? null;
const configDir = argument("--config-dir") ?? ".obsidian";
const once = process.argv.includes("--once");

if (!sourceArgument || !vaultArgument) {
	fail("usage: pnpm dev:schema --source <schema repository> --vault <vault> [--config-dir .obsidian] [--once]");
}

const directory = await mkdtemp(join(tmpdir(), "handbook-dev-schema-"));
let stop;
const cleanup = async () => {
	if (stop) stop();
	await rm(directory, { recursive: true, force: true });
};
for (const signal of ["SIGINT", "SIGTERM"]) {
	process.on(signal, () => {
		void cleanup().finally(() => process.exit(0));
	});
}

try {
	const output = join(directory, "watch.mjs");
	await build({
		entryPoints: ["tools/devSchema/watch.mts"],
		bundle: true,
		platform: "node",
		format: "esm",
		outfile: output,
		logLevel: "silent",
		external: ["obsidian"],
	});
	const { runOnce, watchSource } = await import(pathToFileURL(output).href);
	const options = { sourceRoot: resolve(sourceArgument), vaultRoot: resolve(vaultArgument), configDir };
	if (once) {
		const ok = await runOnce(options);
		await cleanup();
		process.exit(ok ? 0 : 1);
	}
	stop = await watchSource(options);
} catch (error) {
	await cleanup();
	fail(error instanceof Error ? error.message : String(error));
}
