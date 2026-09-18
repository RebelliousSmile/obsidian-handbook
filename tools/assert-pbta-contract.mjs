import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
	PBTA_DOCUMENT_CODECS,
	PBTA_TOML_VERSION,
} from "schema-pbta";

const releaseUrl =
	"https://github.com/RebelliousSmile/schema-pbta/releases/download/v5.4.0/schema-pbta-5.4.0.tgz";
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
assert.equal(packageJson.dependencies["schema-pbta"], releaseUrl);

const lockfile = readFileSync("pnpm-lock.yaml", "utf8");
assert.ok(lockfile.includes(`specifier: ${releaseUrl}`));
assert.match(
	lockfile,
	/schema-pbta:[\s\S]*?version: 5\.4\.0/,
);

const manifestUrl = import.meta.resolve("schema-pbta/corpus/cases.json");
const manifest = JSON.parse(readFileSync(new URL(manifestUrl), "utf8"));
assert.equal(manifest.tomlVersion, PBTA_TOML_VERSION);

for (const testCase of manifest.cases) {
	const sourceUrl = import.meta.resolve(`schema-pbta/corpus/${testCase.path}`);
	const source = readFileSync(new URL(sourceUrl), "utf8");
	const codec = PBTA_DOCUMENT_CODECS[testCase.target];
	assert.ok(codec, `missing codec for ${testCase.target}`);
	if (testCase.expect === "reject") {
		assert.throws(() => codec.parseToml(source), testCase.path);
		continue;
	}
	const parsed = codec.parseToml(source);
	assert.deepEqual(codec.parseToml(codec.stringifyToml(parsed)), parsed, testCase.path);
}

for (const target of [
	"masks-playbook",
	"monster-of-the-week-playbook",
	"monsterhearts-playbook",
	"urban-shadows-playbook",
	"the-sprawl-playbook",
]) {
	assert.ok(manifest.cases.some((testCase) => testCase.target === target && testCase.expect === "accept"), `missing accepted ${target} case`);
}

console.log("PbtA release URL, lockfile integrity and shared contract corpus passed.");
