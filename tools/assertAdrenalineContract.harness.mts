import assert from "node:assert/strict";
import { ADRENALINE_DOCUMENT_CODECS } from "schema-adrenaline";
import { PJ_PRESENTATION } from "schema-adrenaline/presentation";
import { readFileSync } from "node:fs";
import { assertAdrenalineContractVersion, declaredContractMajor, loadAdrenalineContractCases } from "./adrenalineContractCorpus.mts";
import { BRUMES_BLOCKS } from "../src/features/blocks/registry";
import { TOML_EXPORTS } from "../src/features/blocks/tomlExports";
import { contractRefusal, schemaRefusal } from "../src/features/adrenaline/publishedContract";
import { parse as parseToml } from "smol-toml";
import monstreSchemaFile from "schema-adrenaline/schemas/monstre.schema.json";
import pjSchemaFile from "schema-adrenaline/schemas/pj.schema.json";
import pnjSchemaFile from "schema-adrenaline/schemas/pnj.schema.json";

class El {
	textContent = "";
	children: El[] = [];
	dataset: Record<string, string> = {};
	classes: string[] = [];
	classList = { add: (...names: string[]) => this.classes.push(...names) };
	constructor(public tagName: string) {}
	setAttribute(name: string, value: string): void { this.dataset[`attr-${name}`] = value; }
	appendChild(child: El): El { this.children.push(child); return child; }
}
const doc = { createElement: (tag: string) => new El(tag) };
const text = (element: El): string => element.textContent + element.children.map(text).join("");
const blockIds = { pj: "adrenaline-pj", pnj: "adrenaline-pnj", monstre: "adrenaline-monstre" } as const;

/* The major is read from the dependency the project declares; an upstream minor or patch is adopted without a code change, a lower major is refused, and a higher one is a train ahead of the pin. */
const declared = declaredContractMajor({ dependencies: { "schema-adrenaline": "https://example.test/releases/download/v7.1.0/schema-adrenaline-7.1.0.tgz" } });
assert.equal(declared, 7);
assertAdrenalineContractVersion("7.0.0", declared);
assertAdrenalineContractVersion("7.4.2", declared);
assertAdrenalineContractVersion("8.0.0", declared);
assert.throws(() => assertAdrenalineContractVersion("6.9.0", declared), /major 7 or later/);
assert.throws(() => assertAdrenalineContractVersion(undefined, declared), /major 7 or later/);
assert.throws(() => declaredContractMajor({}), /not declared/);
const cases = loadAdrenalineContractCases();
assert.ok(cases.length > 0, "the published Adrenaline contract corpus must not be empty");
assert.ok(cases.some((entry) => entry.expect === "accept"), "the published corpus must include accepted documents");
assert.ok(cases.some((entry) => entry.expect === "reject"), "the published corpus must include rejected documents");
for (const entry of cases) {
	const codec = ADRENALINE_DOCUMENT_CODECS[entry.target];
	const parse = entry.format === "json" ? codec.parseJson : codec.parseToml;
	if (entry.expect === "reject") {
		assert.throws(() => parse(entry.source), entry.path);
		/* What the published codec refuses, Handbook refuses too: its readers return null instead of drawing the document. */
		const refusedBlock = BRUMES_BLOCKS.find((candidate) => candidate.id === blockIds[entry.target]);
		assert.ok(refusedBlock, `${entry.path}: block exists`);
		if (entry.format === "toml") assert.equal(refusedBlock.parse(entry.source), null, `${entry.path}: Handbook refuses what the contract refuses`);
		else {
			let refused: string | undefined = "unparseable";
			try { refused = contractRefusal(entry.target, JSON.parse(entry.source) as Record<string, unknown>); } catch { /* not JSON: refused */ }
			assert.ok(refused, `${entry.path}: Handbook refuses what the contract refuses`);
		}
		continue;
	}
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
/* The insertion template is a document of the published contract: the block parses what it inserts. */
const pjTemplateBody = pjBlock.template().replace(/^```adrenaline-pj\r?\n/, "").replace(/```\s*$/, "");
assert.ok(pjBlock.parse(pjTemplateBody), "the adrenaline-pj insertion template is a valid document");
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
/* The columns a characteristic prints are the ones the presentation publishes (`rangeDisplay`); the entered values and the suffix come from the document and the block, not from a literal. */
const publishedBlocks = PJ_PRESENTATION.sections.flatMap((section) => section.blocks) as readonly { id: string; notes?: readonly string[]; paths: readonly string[]; rowLabels?: readonly string[]; rangeDisplay?: readonly string[]; valueSuffix?: string }[];
const physicalBlock = publishedBlocks.find((block) => block.id === "caracteristiques-physiques");
assert.ok(physicalBlock?.rowLabels && physicalBlock.rangeDisplay, "the published block names its rows and its columns");
const pjDocument = ADRENALINE_DOCUMENT_CODECS.pj.parseToml(pjSource) as unknown;
const entered = (pointer: string): unknown => pointer.split("/").slice(1).reduce<unknown>((found, key) => (found as Record<string, unknown> | undefined)?.[key], pjDocument) as Record<string, unknown>;
const expectedRows = physicalBlock.paths.map((pointer, index) => {
	const record = entered(pointer);
	const values = (physicalBlock.rangeDisplay ?? []).map((column) => `${String(typeof record === "number" ? record : (record as Record<string, unknown>)[column])}${physicalBlock.valueSuffix ? ` ${physicalBlock.valueSuffix}` : ""}`);
	return `${physicalBlock.rowLabels?.[index] ?? ""}${values.join("")}`;
}).join("");
assert.ok(text(physicalCharacteristics).replace(/\s/g, " ").includes(expectedRows.replace(/\s/g, " ")), "PJ displays the published columns of each characteristic, and only them");
/* The renderer follows the published form and appearance, not the block id. */
for (const block of PJ_PRESENTATION.sections.flatMap((section) => section.blocks)) {
	assert.ok(classes.has(`brumes-adrenaline-pj__form-${block.form}`), `PJ block ${block.id} is dispatched on its form ${block.form}`);
	assert.ok(classes.has(`brumes-adrenaline-pj__layout-${block.layout}`), `PJ block ${block.id} carries its published layout`);
}
const appearance = PJ_PRESENTATION.appearance;
for (const name of [`variant-${appearance.variant}`, `surface-${appearance.surface}`, `titles-${appearance.sectionTitles.align}`, `values-${appearance.values.font}`]) {
	assert.ok(pjRender.classes.includes(`brumes-adrenaline-pj--${name}`), `PJ root carries the published appearance ${name}`);
}
assert.match(text(pjRender), new RegExp(PJ_PRESENTATION.sheet.label), "PJ cartouche prints the published sheet label");
assert.match(text(pjRender), /\+1d100/, "PJ stress dice print the published favourable die");
const competences = allElements(pjRender).find((element) => element.classes.includes("brumes-adrenaline-pj__formations-competences"));
assert.ok(competences);
const formationBlock = PJ_PRESENTATION.sections.flatMap((section) => section.blocks).find((block) => block.form === "formation-columns") as { formationTypes?: readonly string[]; formationFields?: { competence: readonly string[] } } | undefined;
assert.ok(formationBlock);
const printedColumns = allElements(competences).filter((element) => element.classes.includes("brumes-adrenaline-pj__formation")).length;
if (formationBlock.formationTypes) {
	/* Every published formation type keeps its column, even when the document leaves it empty. */
	const emptied = pjBlock.render({ ...pjData, formations: [] }, doc as unknown as Document) as unknown as El;
	assert.equal(allElements(emptied).filter((element) => element.classes.includes("brumes-adrenaline-pj__formation")).length, formationBlock.formationTypes.length, "one column per published formation type");
	assert.ok(printedColumns >= formationBlock.formationTypes.length, "a document's formations fill the published columns");
} else {
	assert.equal(printedColumns, pjData.formations?.length, "one competence column per formation");
}
/* The paper sheet has no characteristic on a competence: the game master picks it at the table. */
const firstFormation = pjData.formations?.[0];
assert.ok(firstFormation?.competences?.length, "the PJ witness must carry a competence");
const withCharacteristic = { ...pjData, formations: [{ ...firstFormation, competences: [{ ...firstFormation.competences[0], specialite: "Judo", caracteristique: "dex" as const }] }] };
const characteristicRender = text(pjBlock.render(withCharacteristic, doc as unknown as Document) as unknown as El);
assert.doesNotMatch(characteristicRender, /\(DEX\)/, "a PJ competence prints no characteristic");
assert.match(characteristicRender, /\(Judo\)/, "a PJ competence prints its speciality between parentheses");
/* The Malus column follows the paper sheet once published: Choc circles, a Divers frame, the circled total. */
const pjForms = new Set(PJ_PRESENTATION.sections.flatMap((section) => section.blocks).map((block) => block.form as string | undefined));
if (pjForms.has("malus-scale")) {
	const malusSource = `${pjSource.replace(/\[etatDePartie\.malus\][\s\S]*?(?=\n\[\[?(?!etatDePartie\.malus))/, "")}
[etatDePartie.malus]
divers = "1 malus (froid)"
total = 3

[etatDePartie.malus.choc]
rounds = 2
`;
	const malusData = pjBlock.parse(malusSource);
	assert.ok(malusData, "a PJ with the published Malus column parses");
	const malusRender = pjBlock.render(malusData, doc as unknown as Document) as unknown as El;
	const area = (id: string): El => {
		const found = allElements(malusRender).find((element) => element.classes.includes(`brumes-adrenaline-pj__${id}`));
		assert.ok(found, `PJ block ${id} is rendered`);
		return found;
	};
	assert.equal(allElements(area("choc")).filter((element) => element.classes.includes("brumes-adrenaline-pj__dot-filled")).length, 2, "Choc fills one circle per shock malus");
	assert.match(text(area("divers")), /1 malus \(froid\)/, "Divers prints its free text");
	const current = allElements(area("total-malus")).filter((element) => element.classes.includes("brumes-adrenaline-pj__scale-step--current"));
	assert.deepEqual(current.map(text), ["3"], "Total des malus circles the current total only");
	/* The scale prints the note the contract publishes ("1 malus = -10 %"); once that wording is taken out, no entered malus is a percentage. */
	const malusNotes = ["choc", "divers", "total-malus"].flatMap((id) => publishedBlocks.find((block) => block.id === id)?.notes ?? []);
	assert.ok(malusNotes.length > 0, "the Malus column publishes its note");
	let malusText = text(area("choc")) + text(area("divers")) + text(area("total-malus"));
	for (const note of malusNotes) {
		assert.ok(malusText.includes(note), `the published note is printed: ${note}`);
		malusText = malusText.split(note).join("");
	}
	assert.doesNotMatch(malusText, /%/, "no malus is a percentage");
}
/* An unpublished form degrades to plain lines instead of throwing or vanishing. */
const probe = PJ_PRESENTATION.sections[0].blocks[0] as { form?: string };
if (!Object.isFrozen(probe)) {
	const published = probe.form;
	probe.form = "unpublished-form";
	try {
		const degraded = pjBlock.render(pjData, doc as unknown as Document) as unknown as El;
		assert.match(text(degraded), /Naïma Berthier/, "an unknown form still shows its values");
	} finally {
		probe.form = published;
	}
}
/* Parity with the published codec: every document an accepted witness can be bent into is refused by Handbook exactly when the codec refuses it (a key removed, a value of the wrong type, a key the contract does not publish). */
type Path = (string | number)[];
const nodes = (value: unknown, path: Path = []): Path[] => {
	if (Array.isArray(value)) return [path, ...value.flatMap((item, index) => nodes(item, [...path, index]))];
	if (value !== null && typeof value === "object") return [path, ...Object.keys(value).flatMap((key) => nodes((value as Record<string, unknown>)[key], [...path, key]))];
	return [path];
};
const at = (root: unknown, path: Path): unknown => path.reduce<unknown>((found, key) => (found as Record<string | number, unknown>)[key], root);
const bent = (root: unknown, path: Path, change: (holder: Record<string | number, unknown>, key: string | number) => void): unknown => {
	const copy = JSON.parse(JSON.stringify(root)) as unknown;
	const holder = at(copy, path.slice(0, -1)) as Record<string | number, unknown>;
	change(holder, path[path.length - 1]);
	return copy;
};
let bentCount = 0;
let bentRefused = 0;
for (const entry of cases) {
	if (entry.expect !== "accept" || entry.format !== "toml") continue;
	const codec = ADRENALINE_DOCUMENT_CODECS[entry.target];
	const witness = parseToml(entry.source) as Record<string, unknown>;
	assert.equal(contractRefusal(entry.target, witness), undefined, `${entry.path}: the witness is accepted`);
	const variants: unknown[] = [];
	for (const path of nodes(witness)) {
		if (path.length === 0) {
			variants.push({ ...witness, inconnuPublie: 1 });
			continue;
		}
		const value = at(witness, path);
		variants.push(bent(witness, path, (holder, key) => { if (Array.isArray(holder)) holder.splice(Number(key), 1); else delete holder[key]; }));
		variants.push(bent(witness, path, (holder, key) => { holder[key] = typeof value === "string" ? 12345 : "zz"; }));
		variants.push(bent(witness, path, (holder, key) => { holder[key] = typeof value === "boolean" ? 1 : true; }));
		variants.push(bent(witness, path, (holder, key) => { holder[key] = [value]; }));
		if (value !== null && typeof value === "object" && !Array.isArray(value)) {
			variants.push(bent(witness, path, (holder, key) => { holder[key] = { ...(value as Record<string, unknown>), inconnuPublie: 1 }; }));
		}
		if (typeof value === "number") {
			variants.push(bent(witness, path, (holder, key) => { holder[key] = -1; }));
			variants.push(bent(witness, path, (holder, key) => { holder[key] = 1000001; }));
		}
	}
	for (const variant of variants) {
		let codecRefuses = false;
		try { codec.parseJson(JSON.stringify(variant)); } catch { codecRefuses = true; }
		const refusal = contractRefusal(entry.target, variant as Record<string, unknown>);
		assert.equal(refusal !== undefined, codecRefuses, `${entry.path}: parity with the codec on ${JSON.stringify(variant).slice(0, 160)} (${String(refusal)})`);
		bentCount++;
		if (refusal) bentRefused++;
	}
}
assert.ok(bentCount > 0 && bentRefused > 0, "the bent witnesses are both accepted and refused");

/* The reading of a schema is proved on schemas of its own: each keyword refuses, and each accepts what it allows. */
const probeRoot = {
	type: "object",
	additionalProperties: false,
	required: ["a"],
	properties: {
		a: { type: "integer", minimum: 1, maximum: 5 },
		s: { type: "string", minLength: 2, maxLength: 3, pattern: "^[a-z]+$" },
		e: { enum: [1, "x", true] },
		c: { const: 7 },
		l: { type: "array", minItems: 1, maxItems: 2, items: { type: "boolean" } },
		any: { anyOf: [{ type: "integer" }, { type: "object", required: ["current"], additionalProperties: false, properties: { current: { type: "integer" } } }] },
		one: { oneOf: [{ type: "number" }, { type: "integer" }] },
		ref: { $ref: "#/definitions/n" },
		map: { type: "object", additionalProperties: { type: "integer" } },
	},
	definitions: { n: { type: "integer", minimum: 10 } },
};
const refusedBy = (value: unknown): string | undefined => schemaRefusal(probeRoot, value, "", "pj", probeRoot);
assert.equal(refusedBy({ a: 1 }), undefined);
assert.equal(refusedBy({ a: 5, s: "ab", e: true, c: 7, l: [true, false], any: { current: 3 }, ref: 10 }), undefined);
assert.equal(refusedBy({ a: 1, any: 3, map: { x: 2 } }), undefined);
for (const [label, value] of [
	["closed root", { a: 1, z: 1 }], ["required", {}], ["type", { a: "1" }], ["non-integer", { a: 1.5 }], ["minimum", { a: 0 }], ["maximum", { a: 6 }],
	["minLength", { a: 1, s: "a" }], ["maxLength", { a: 1, s: "abcd" }], ["pattern", { a: 1, s: "AB" }], ["enum of any value", { a: 1, e: 2 }],
	["enum is typed", { a: 1, e: "1" }], ["const of a number", { a: 1, c: 8 }], ["const is typed", { a: 1, c: "7" }], ["minItems", { a: 1, l: [] }],
	["maxItems", { a: 1, l: [true, true, true] }], ["items", { a: 1, l: ["x"] }], ["anyOf none", { a: 1, any: "x" }], ["anyOf closed branch", { a: 1, any: { current: 1, z: 2 } }],
	["oneOf exactly one", { a: 1, one: 3 }], ["$ref", { a: 1, ref: 9 }], ["null", { a: null }], ["typed additional values", { a: 1, map: { x: "s" } }],
] as const) {
	assert.ok(refusedBy(value), `the reading of a schema refuses: ${label}`);
}
assert.ok(schemaRefusal({ $ref: "#/definitions/absent" }, 1, "", "pj", {}), "an unresolved reference is a refusal");
assert.ok(contractRefusal("pj", { caracteristiques: { for: { minimum: 1, current: 1, maximum: 2, zz: 3 } } }), "characteristics are read, not skipped");

/* The three keywords that make a sheet strict are asserted on the published documents themselves, not only through the sweep above:
   a key the schema requires, a key it does not publish, and the creature that mixes its alternative state with its states. */
for (const target of ["pj", "pnj", "monstre"] as const) {
	const entry = cases.find((candidate) => candidate.expect === "accept" && candidate.format === "toml" && candidate.target === target);
	assert.ok(entry, `${target}: the corpus holds an accepted document`);
	const witness = parseToml(entry.source) as Record<string, unknown>;
	const published = ({ pj: pjSchemaFile, pnj: pnjSchemaFile, monstre: monstreSchemaFile } as unknown as Record<string, { required?: string[]; additionalProperties?: unknown }>)[target];
	assert.equal(published.additionalProperties, false, `${target}: the published sheet is closed`);
	assert.ok(published.required && published.required.length > 0, `${target}: the published sheet requires keys`);
	for (const key of published.required) {
		if (!(key in witness)) continue;
		const without = { ...witness };
		delete without[key];
		assert.ok(contractRefusal(target, without), `${target}: the required key "${key}" cannot be left out`);
		assert.ok(schemaRefusal(published as never, without, "", target, published as never), `${target}: the schema refuses without "${key}"`);
	}
	assert.ok(contractRefusal(target, { ...witness, inconnuPublie: 1 }), `${target}: a key the contract does not publish is refused at the root`);
	for (const key of Object.keys(witness)) {
		const nested = witness[key];
		if (nested === null || typeof nested !== "object" || Array.isArray(nested)) continue;
		const closedBy = contractRefusal(target, { ...witness, [key]: { ...(nested as Record<string, unknown>), inconnuPublie: 1 } });
		let codecRefuses = false;
		try { ADRENALINE_DOCUMENT_CODECS[target].parseJson(JSON.stringify({ ...witness, [key]: { ...(nested as Record<string, unknown>), inconnuPublie: 1 } })); } catch { codecRefuses = true; }
		assert.equal(closedBy !== undefined, codecRefuses, `${target}: "${key}" is closed exactly when the codec closes it`);
	}
}
/* A name made only of blanks: the codec accepts it (one character), so does Handbook, which prints it as entered; the empty name is refused by both. */
for (const target of ["pj", "pnj", "monstre"] as const) {
	const entry = cases.find((candidate) => candidate.expect === "accept" && candidate.format === "toml" && candidate.target === target && /^nom = "[^"]*"$/m.test(candidate.source));
	assert.ok(entry, `${target}: the corpus holds an accepted document with a name`);
	const block = BRUMES_BLOCKS.find((candidate) => candidate.id === blockIds[target]);
	assert.ok(block, `${target}: the block exists`);
	for (const [name, accepted] of [[" ", true], ["", false]] as const) {
		const source = entry.source.replace(/^nom = "[^"]*"$/m, `nom = "${name}"`);
		let codecAccepts = true;
		try { ADRENALINE_DOCUMENT_CODECS[target].parseToml(source); } catch { codecAccepts = false; }
		assert.equal(codecAccepts, accepted, `${target}: the codec ${accepted ? "accepts" : "refuses"} the name ${JSON.stringify(name)}`);
		assert.equal(block.parse(source) !== null, accepted, `${target}: Handbook reads the name ${JSON.stringify(name)} as the codec does`);
	}
}
const alternative = cases.find((candidate) => candidate.expect === "accept" && candidate.target === "monstre" && candidate.format === "toml" && "etatAlternatif" in (parseToml(candidate.source) as Record<string, unknown>));
assert.ok(alternative, "the corpus holds a creature with an alternative state");
const alternativeDocument = parseToml(alternative.source) as Record<string, unknown>;
assert.equal(contractRefusal("monstre", alternativeDocument), undefined, "the alternative state alone is accepted");
for (const [label, mixed] of [["with its states", { etats: [] }], ["with an active state", { etatActif: "zz" }]] as const) {
	const document = { ...alternativeDocument, ...mixed };
	let codecRefuses = false;
	try { ADRENALINE_DOCUMENT_CODECS.monstre.parseJson(JSON.stringify(document)); } catch { codecRefuses = true; }
	assert.ok(codecRefuses, `the codec refuses the alternative state ${label}`);
	assert.ok(contractRefusal("monstre", document), `Handbook refuses the alternative state ${label}`);
}
// A document with no alternative state keeps its states: the mixing rule does not refuse a creature that has only states.
const withStates = cases.find((candidate) => candidate.expect === "accept" && candidate.target === "monstre" && candidate.format === "toml" && !("etatAlternatif" in (parseToml(candidate.source) as Record<string, unknown>)) && "etats" in (parseToml(candidate.source) as Record<string, unknown>));
assert.ok(withStates, "the corpus holds a creature with states");
assert.equal(contractRefusal("monstre", parseToml(withStates.source) as Record<string, unknown>), undefined, "a creature with states is accepted");
// The reading of a schema counts the branches that accept: two accepting branches are refused, whatever the number.
assert.ok(refusedBy({ a: 1, one: 3 }), "oneOf refuses when two branches accept");
assert.equal(refusedBy({ a: 1, one: 1.5 }), undefined, "oneOf accepts when exactly one branch accepts");

console.log(`Adrenaline contract: ${cases.length} canonical cases passed, ${bentCount} bent witnesses in parity with the codec (${bentRefused} refused).`);
