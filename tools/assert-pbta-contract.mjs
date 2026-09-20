import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
	PBTA_DOCUMENT_CODECS,
	PBTA_TOML_VERSION,
} from "schema-pbta";

/* The pin is read, never copied: a producer release is not this repo's to hard-code. What is checked
   is that every place recording the pin agrees with package.json — the bump stays a one-line edit. */
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const releaseUrl = packageJson.dependencies["schema-pbta"];
assert.ok(
	releaseUrl.startsWith("https://github.com/") &&
		releaseUrl.includes("/schema-pbta/releases/download/v") &&
		releaseUrl.endsWith(".tgz"),
	`schema-pbta must be pinned to a public release asset, found ${releaseUrl}`,
);
const pinnedVersion = releaseUrl.slice(releaseUrl.lastIndexOf("-") + 1, -".tgz".length);

/* Only pnpm-lock.yaml is tracked, so it is the only lockfile a clean checkout has. */
const lockfile = readFileSync("pnpm-lock.yaml", "utf8");
assert.ok(lockfile.includes(`specifier: ${releaseUrl}`), `pnpm lockfile must record the pinned specifier ${releaseUrl}`);
const resolution = lockfile
	.split("\n")
	.filter((line) => line.indexOf("resolution: {") >= 0)
	.filter((line) => line.indexOf(`schema-pbta-${pinnedVersion}.tgz`) >= 0)[0];
assert.ok(resolution, `pnpm lockfile must resolve the schema-pbta v${pinnedVersion} release asset`);
assert.ok(
	resolution.indexOf("integrity: sha512-") >= 0,
	"the resolved schema-pbta tarball must carry its SRI, or the pin proves nothing about its content",
);
/* A signed redirect is recorded without an SRI and expires: a clean checkout then fails on
   ERR_PNPM_MISSING_TARBALL_INTEGRITY, and --no-frozen-lockfile does not repair it. */
assert.equal(
	lockfile.indexOf("release-assets.githubusercontent.com"),
	-1,
	"the lockfile records a signed release redirect: rewrite it to the stable releases/download URL and its SRI",
);

/* schema-pbta does not export ./package.json, so import.meta.resolve fails with
   ERR_PACKAGE_PATH_NOT_EXPORTED: the installed manifest is read off the install path. */
const installedPackage = JSON.parse(readFileSync("node_modules/schema-pbta/package.json", "utf8"));
assert.equal(installedPackage.version, pinnedVersion, "the installed package must be the pinned release");

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
