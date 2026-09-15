import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import { readGamePack } from "../src/games/fromSchema";

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

console.log("Game pack contract assertions passed.");
