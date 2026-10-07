import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import { readGamePack, toGamePackDocument } from "../src/games/fromSchema";
import { sectionTokens } from "../src/games/types";

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(join(process.cwd(), path), "utf8"));
}

const schema = readJson("schemas/appearance/game-pack.schema.json");
const valid = readJson("corpus/game-packs/valid.json");
const unsafeToken = readJson("corpus/game-packs/invalid-token-name.json");
const validate = new Ajv({ allErrors: true }).compile(schema);

assert.equal(validate(valid), true, JSON.stringify(validate.errors));
assert.equal(validate(unsafeToken), false, "the strict schema accepts an unsafe token name");

const projected = readGamePack(valid);
assert.notEqual(projected, null);
assert.equal(projected!.style.base.note["--font-text-theme"], "Example Serif");
assert.equal(projected!.assets?.stylesheets?.[0], "styles/example.css");
assert.equal(projected!.shapes?.["theme-card"]?.title.heading, "Theme");

const historicalFixtures = readdirSync(
	"corpus/game-packs/appearance-fixtures",
)
	.filter((name) => name.endsWith(".json"))
	.sort();

assert.deepEqual(historicalFixtures, [
	"adrenaline.json",
	"city-of-mist-shapes.json",
	"city-of-mist.json",
	"legend-in-the-mist.json",
	"otherscape.json",
]);

for (const name of historicalFixtures) {
	const fixture = readJson(`corpus/game-packs/appearance-fixtures/${name}`);
	assert.equal(validate(fixture), true, `${name}: ${JSON.stringify(validate.errors)}`);
	assert.notEqual(readGamePack(fixture), null, `${name} did not project`);
}

const tolerated = readGamePack(unsafeToken);
assert.notEqual(tolerated, null);
assert.equal(tolerated!.style.base.note["--safe-token"], "kept");
assert.equal(tolerated!.style.base.note["--unsafe;rule"], undefined);

// The section layer: one more paper a pack may publish, read like any other.
const section = readJson("corpus/game-packs/section.json");
const unsafeSection = readJson("corpus/game-packs/invalid-section-token-name.json");
const sectionWorkspace = readJson("corpus/game-packs/invalid-section-workspace.json");

assert.equal(validate(section), true, JSON.stringify(validate.errors));
assert.equal(validate(unsafeSection), false, "the strict schema accepts an unsafe section token name");
assert.equal(validate(sectionWorkspace), false, "the strict schema lets a section dress the workspace");

const sectioned = readGamePack(section);
assert.notEqual(sectioned, null);
assert.deepEqual(sectioned!.style.section, {
	note: { "--background-primary": "#1b1b1b", "--text-normal": "#f4efe4" },
});
assert.deepEqual(sectionTokens(sectioned!.style, sectioned!.polarities ?? []), sectioned!.style.section!.note);
// The layer is only read by a game that holds one polarity.
assert.equal(sectionTokens(sectioned!.style, ["light", "dark"]), null);
assert.equal(sectionTokens(sectioned!.style, []), null);
// A pack that never named the layer does not grow one, read or written back.
assert.equal("section" in projected!.style, false);
assert.equal("section" in (toGamePackDocument(projected!).style as object), false);
assert.deepEqual(
	(toGamePackDocument(sectioned!).style as { section?: unknown }).section,
	sectioned!.style.section,
);
assert.equal(validate(toGamePackDocument(sectioned!)), true, JSON.stringify(validate.errors));

// The token-name frontier holds on this layer as on the others.
const toleratedSection = readGamePack(unsafeSection);
assert.notEqual(toleratedSection, null);
assert.equal(toleratedSection!.style.section?.note["--safe-token"], "kept");
assert.equal(toleratedSection!.style.section?.note["--unsafe;rule"], undefined);

console.log("Game pack contract assertions passed.");
