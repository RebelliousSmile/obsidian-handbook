import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
	PBTA_DOCUMENT_CODECS,
	PBTA_TOML_VERSION,
} from "schema-pbta";

const releaseUrl =
	"https://github.com/RebelliousSmile/schema-pbta/releases/download/v1.0.0/schema-pbta-1.0.0.tgz";
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
assert.equal(packageJson.dependencies["schema-pbta"], releaseUrl);

const lockfile = readFileSync("pnpm-lock.yaml", "utf8");
assert.ok(lockfile.includes(`specifier: ${releaseUrl}`));
assert.ok(lockfile.includes(`tarball: ${releaseUrl}`));
assert.match(
	lockfile,
	/schema-pbta@https:[\s\S]*?resolution: \{integrity: sha512-[^,]+, tarball:/,
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

console.log("PbtA release URL, lockfile integrity and shared contract corpus passed.");
