import assert from "node:assert/strict";
import { ADRENALINE_DOCUMENT_CODECS } from "schema-adrenaline";
import { assertAdrenalineContractVersion, loadAdrenalineContractCases } from "./adrenalineContractCorpus.mts";
import { BRUMES_BLOCKS } from "../src/features/blocks/registry";
import { TOML_EXPORTS } from "../src/features/blocks/tomlExports";

class El {
	textContent = "";
	children: El[] = [];
	dataset: Record<string, string> = {};
	classes: string[] = [];
	classList = { add: (...names: string[]) => this.classes.push(...names) };
	constructor(public tagName: string) {}
	appendChild(child: El): El { this.children.push(child); return child; }
}
const doc = { createElement: (tag: string) => new El(tag) };
const text = (element: El): string => element.textContent + element.children.map(text).join("");
const blockIds = { pj: "adrenaline-pj", pnj: "adrenaline-pnj", monstre: "adrenaline-monstre" } as const;

assertAdrenalineContractVersion("1.0.0");
assert.throws(() => assertAdrenalineContractVersion("1.0.1"), /package version must be 1.0.0/);
const cases = loadAdrenalineContractCases();
assert.equal(cases.length, 35);
for (const entry of cases) {
	const codec = ADRENALINE_DOCUMENT_CODECS[entry.target];
	const parse = entry.format === "json" ? codec.parseJson : codec.parseToml;
	if (entry.expect === "reject") { assert.throws(() => parse(entry.source), entry.path); continue; }
	const value = parse(entry.source);
	const output = entry.format === "json" ? codec.stringifyJson(value) : codec.stringifyToml(value);
	assert.deepEqual(parse(output), value, entry.path);
	const toml = entry.format === "toml" ? entry.source : codec.stringifyToml(value);
	const blockId = blockIds[entry.target];
	const block = BRUMES_BLOCKS.find((candidate) => candidate.id === blockId);
	const exporter = TOML_EXPORTS.find((candidate) => candidate.block.id === blockId);
	assert.ok(block && exporter, `${entry.path}: block and exporter exist`);
	const projected = block.parse(toml);
	assert.notEqual(projected, null, `${entry.path}: Handbook projection`);
	const before = text(block.render(projected, doc as unknown as Document) as unknown as El);
	assert.ok(before.trim(), `${entry.path}: Handbook render`);
	const roundTrip = exporter.toToml(projected);
	codec.parseToml(roundTrip);
	const reread = block.parse(roundTrip);
	assert.notEqual(reread, null, `${entry.path}: Handbook export rereads`);
	assert.equal(text(block.render(reread, doc as unknown as Document) as unknown as El), before, `${entry.path}: rendering is stable`);
}
assert.deepEqual(new Set(cases.map((entry) => entry.target)), new Set(["pj", "pnj", "monstre"]));
console.log(`Adrenaline contract: ${cases.length} canonical cases passed.`);
