import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ADRENALINE_DOCUMENT_CODECS } from "schema-adrenaline";
import { BRUMES_BLOCKS } from "../src/features/blocks/registry";
import { TOML_EXPORTS } from "../src/features/blocks/tomlExports";
import { readGamePluginManifest } from "../src/games/pluginManifest";

const sourceRoot = process.env.SCHEMA_ADRENALINE_ROOT;
assert.ok(sourceRoot, "SCHEMA_ADRENALINE_ROOT is required");
const declared = JSON.parse(readFileSync(join(sourceRoot, "handbook/adrenaline/pack.json"), "utf8"));
const hostVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
const parsed = readGamePluginManifest(declared, hostVersion);
assert.ok(parsed.manifest, parsed.error);
assert.match(declared.version, /^\d+\.\d+\.\d+$/, "source pack must declare a release version");
assert.equal(parsed.manifest.version, declared.version, "pack version must come from the source manifest");
assert.equal(parsed.manifest.pack.id, "adrenaline");
assert.deepEqual(
	[...parsed.manifest.requires].sort(),
	["block:adrenaline-pj", "block:adrenaline-pnj", "block:adrenaline-monstre", "style:adrenaline"].sort(),
	"source pack must publish the exact Adrenaline block capabilities",
);

for (const target of ["pj", "pnj", "monstre"] as const) {
	const blockId = `adrenaline-${target}`;
	const block = BRUMES_BLOCKS.find((entry) => entry.id === blockId);
	const exporter = TOML_EXPORTS.find((entry) => entry.block.id === blockId);
	assert.ok(block && exporter, `${blockId}: renderer and exporter are required`);
	const directory = join(sourceRoot, "examples/adrenaline", target);
	for (const file of readdirSync(directory).filter((entry) => entry.endsWith(".toml"))) {
		const source = readFileSync(join(directory, file), "utf8");
		const canonical = ADRENALINE_DOCUMENT_CODECS[target].parseToml(source);
		const projected = block.parse(source);
		assert.ok(projected, `${target}/${file}: Handbook rejected a source witness`);
		const exported = ADRENALINE_DOCUMENT_CODECS[target].parseToml(exporter.toToml(projected));
		assert.deepEqual(exported, canonical, `${target}/${file}: source round trip lost data`);
	}
}
console.log(`Adrenaline source pack ${declared.version} and six witnesses passed.`);
