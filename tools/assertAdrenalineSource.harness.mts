import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseToml } from "smol-toml";
import { BRUMES_BLOCKS } from "../src/features/blocks/registry";
import { TOML_EXPORTS } from "../src/features/blocks/tomlExports";

const sourceRoot = process.env.SCHEMA_ADRENALINE_ROOT;
assert.ok(sourceRoot, "SCHEMA_ADRENALINE_ROOT is required");
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
