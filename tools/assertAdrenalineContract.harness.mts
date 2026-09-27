import assert from "node:assert/strict";
import { ADRENALINE_DOCUMENT_CODECS } from "schema-adrenaline";
import { PJ_PRESENTATION } from "schema-adrenaline/presentation";
import { readFileSync } from "node:fs";
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

assertAdrenalineContractVersion("2.0.0");
/* An upstream minor or patch is adopted without a code change; the next contract major is not. */
assertAdrenalineContractVersion("2.4.2");
assert.throws(() => assertAdrenalineContractVersion("1.0.0"), /must be a 2.x contract/);
assert.throws(() => assertAdrenalineContractVersion(undefined), /must be a 2.x contract/);
const cases = loadAdrenalineContractCases();
assert.ok(cases.length > 0, "the published Adrenaline contract corpus must not be empty");
assert.ok(cases.some((entry) => entry.expect === "accept"), "the published corpus must include accepted documents");
assert.ok(cases.some((entry) => entry.expect === "reject"), "the published corpus must include rejected documents");
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
const pjSource = readFileSync("node_modules/schema-adrenaline/examples/adrenaline/pj/survivante-complete.toml", "utf8");
const pjBlock = BRUMES_BLOCKS.find((entry) => entry.id === "adrenaline-pj");
assert.ok(pjBlock);
const pjData = pjBlock.parse(pjSource);
assert.ok(pjData);
const pjRender = pjBlock.render(pjData, doc as unknown as Document) as unknown as El;
const allElements = (element: El): El[] => [element, ...element.children.flatMap(allElements)];
const classes = new Set(allElements(pjRender).flatMap((element) => element.classes));
for (const section of PJ_PRESENTATION.sections) {
	assert.ok(classes.has(`brumes-adrenaline-pj--${section.id}`), `PJ section ${section.id} is rendered`);
	for (const block of section.blocks) assert.ok(classes.has(`brumes-adrenaline-pj__${block.id}`), `PJ block ${block.id} is rendered`);
}
assert.match(text(pjRender), /Stress|stress/, "PJ displays its published stress area");
assert.match(text(pjRender), /Naïma Berthier/, "PJ preserves the character name's published spelling and case");
assert.match(text(pjRender), /Contusion/, "PJ displays the document's current states");
const physicalCharacteristics = allElements(pjRender).find((element) => element.classes.includes("brumes-adrenaline-pj__caracteristiques-physiques"));
assert.ok(physicalCharacteristics);
assert.match(text(physicalCharacteristics), /0 %30 %/, "PJ displays both minimum and current values");
console.log(`Adrenaline contract: ${cases.length} canonical cases passed.`);
