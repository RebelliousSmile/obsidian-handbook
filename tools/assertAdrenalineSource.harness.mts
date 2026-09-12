import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseToml } from "smol-toml";
import { BRUMES_BLOCKS } from "../src/features/blocks/registry";
import { TOML_EXPORTS } from "../src/features/blocks/tomlExports";
import { readGamePluginManifest } from "../src/games/pluginManifest";

const sourceRoot = process.env.SCHEMA_ADRENALINE_ROOT;
assert.ok(sourceRoot, "SCHEMA_ADRENALINE_ROOT is required");
const pluginSource = JSON.parse(
	readFileSync(join(sourceRoot, "handbook", "adrenaline", "pack.json"), "utf8"),
) as unknown;
const handbookVersion = (
	JSON.parse(readFileSync("package.json", "utf8")) as { version: string }
).version;
const pluginResult = readGamePluginManifest(pluginSource, handbookVersion);
assert.ok(pluginResult.manifest, pluginResult.error);
const gamePlugin = pluginResult.manifest;
assert.equal(gamePlugin.version, "0.3.0");
assert.equal(gamePlugin.minimumHandbookVersion, "2.7.0");
assert.deepEqual(gamePlugin.requires, [
	"block:adrenaline-pj",
	"block:adrenaline-pnj",
	"block:adrenaline-monstre",
	"style:adrenaline",
]);
assert.equal(gamePlugin.pack.id, "adrenaline");
assert.equal(gamePlugin.pack.label, "Adrenaline System");
assert.deepEqual(gamePlugin.pack.polarities, ["light", "dark"]);
for (const layer of [gamePlugin.pack.style.light, gamePlugin.pack.style.dark]) {
	for (const token of [
		"--adrenaline-panel",
		"--adrenaline-section-band",
		"--adrenaline-section-band-ink",
		"--adrenaline-band",
		"--adrenaline-band-ink",
		"--adrenaline-rule",
		"--adrenaline-page-texture",
		"--adrenaline-callout-surface",
		"--adrenaline-callout-ink",
		"--adrenaline-signal",
		"--adrenaline-signal-ink",
	]) {
		assert.ok(layer.note[token], `Missing ${token}`);
	}
	for (const token of [
		"--background-primary",
		"--background-primary-alt",
		"--background-secondary",
		"--text-normal",
		"--text-muted",
		"--background-modifier-border",
		"--background-modifier-hover",
		"--interactive-accent",
	]) {
		assert.ok(layer.workspace[token], `Missing workspace ${token}`);
	}
	assert.equal(
		Object.keys(layer.workspace).some((token) =>
			token.includes("texture"),
		),
		false,
		"Workspace tokens must not contain page textures",
	);
}
assert.deepEqual(Object.keys(gamePlugin.pack.assets?.images ?? {}), [
	"paper-grain",
	"dark-organic",
	"warning-stripe",
]);
assert.deepEqual(Object.keys(gamePlugin.pack.assets?.fonts ?? {}), [
	"Adrenaline Body",
	"Adrenaline Display",
]);
const constantsUrl = pathToFileURL(
	join(sourceRoot, "src", "zod", "constants.ts"),
).href;
const { TARGETS } = (await import(constantsUrl)) as {
	TARGETS: Array<{ name: string; zod: { safeParse(value: unknown): { success: boolean; error?: unknown } } }>;
};

const targets = new Map(TARGETS.map((target) => [target.name, target.zod]));
for (const name of ["pj", "pnj", "monstre"]) {
	const target = targets.get(name);
	assert.ok(target, `Missing Zod target ${name}`);
	const directory = join(sourceRoot, "examples", "adrenaline", name);
	for (const file of readdirSync(directory).filter((entry) => entry.endsWith(".toml"))) {
		const value = parseToml(readFileSync(join(directory, file), "utf8"));
		const result = target.safeParse(value);
		assert.equal(result.success, true, `${name}/${file}: ${String(result.error)}`);
	}
}

const witnessDirectory = join(process.cwd(), "corpus", "temoins");
for (const file of readdirSync(witnessDirectory).filter((entry) => entry.startsWith("adrenaline-") && entry.endsWith(".toml"))) {
	const blockId = file.slice(0, -5);
	const targetName = blockId.slice("adrenaline-".length);
	const target = targets.get(targetName);
	assert.ok(target, `${file}: unknown Adrenaline target ${targetName}`);
	const block = BRUMES_BLOCKS.find((candidate) => candidate.id === blockId);
	const exportSpec = TOML_EXPORTS.find((candidate) => candidate.block.id === blockId);
	assert.ok(block, `${file}: no registered block`);
	assert.ok(exportSpec, `${file}: no TOML export`);
	const parsed = block.parse(readFileSync(join(witnessDirectory, file), "utf8"));
	assert.ok(parsed, `${file}: Handbook parser rejected its witness`);
	const output = parseToml(exportSpec.toToml(parsed));
	const result = target.safeParse(output);
	assert.equal(result.success, true, `${file}: ${String(result.error)}`);
}

console.log("Adrenaline source assertions passed.");
