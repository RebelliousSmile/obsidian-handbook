/**
 * Guards written by role (`guardsByRole.mjs`), proved on test guards: no guard
 * of the repository is read here, and nothing is written outside the temporary
 * folder.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeLiterals, findLiterals, finalPin, FIXTURE_MARKER } from "./guardsByRole.mjs";

const NAME = "schema-test";
/* The figures are assembled, so that this harness holds none: the versions below are test data of no package. */
const version = (...parts: number[]): string => parts.join(".");
const OLD = version(4, 1, 0);
const NEW = version(4, 2, 0);
const urlOf = (v: string, tag = `v${v}`): string => `https://github.com/RebelliousSmile/${NAME}/releases/${"download"}/${tag}/${NAME}-${v}.tgz`;
const INTEGRITY = `sha512-${"A".repeat(86)}==`;
const packageOf = (url: string) => ({ dependencies: { [NAME]: url } });
const lockOf = (url: string, integrity = INTEGRITY): string => [`  ${NAME}@${url}:`, `    resolution: {integrity: ${integrity}, tarball: ${url}}`, ""].join("\n");

const work = mkdtempSync(join(tmpdir(), "handbook-guards-by-role-"));
try {
	const write = (name: string, lines: string[]): string => {
		const file = join(work, name);
		writeFileSync(file, lines.join("\n"));
		return readFileSync(file, "utf8");
	};

	// A guard that reads package.json holds no figure.
	const byRole = write("by-role.mjs", [
		"const pin = JSON.parse(readFileSync(\"package.json\", \"utf8\")).dependencies[name];",
		"const pattern = new RegExp(`/releases/download/v(\\\\d+\\\\.\\\\d+\\\\.\\\\d+)/${name}-\\\\1\\\\.tgz$`);",
		"assert.ok(url.includes(\"/schema-test/releases/download/v\"));",
		"server.listen(0, \"127.0.0.1\");",
	]);
	assert.deepEqual(findLiterals(byRole), []);

	// A guard that carries the version of the package it measures is refused, file and line named.
	const frozen = write("frozen.mjs", [
		"import assert from \"node:assert/strict\";",
		`assert.equal(installed.version, "${NEW}");`,
		`const tag = "v${NEW}-rc.1";`,
		`const url = "${urlOf(NEW)}";`,
		`// The pin was ${OLD} before the last train.`,
		"/* It moved",
		`   to ${NEW} since. */`,
	]);
	assert.deepEqual(findLiterals(frozen), [
		{ line: 2, kind: "version number", literal: NEW },
		{ line: 3, kind: "release tag", literal: `v${NEW}-rc.1` },
		{ line: 4, kind: "release archive URL", literal: `releases/download/v${NEW}/${NAME}-${NEW}.tgz` },
	]);
	const described = describeLiterals({ "tools/frozen.mjs": frozen, "tools/by-role.mjs": byRole });
	assert.equal(described.length, 3);
	assert.ok(described[0].startsWith(`tools/frozen.mjs:2: version number ${NEW} is written in a guard`), described[0]);

	// A closed test datum is admitted on the line that carries the marker and its reason, and only there.
	const fixture = write("fixture.mjs", [
		`const archive = "${urlOf(OLD)}"; // ${FIXTURE_MARKER} the release the envelope is exercised on, not the pin`,
		`const pack = { version: "${OLD}" }; /* ${FIXTURE_MARKER} a made-up pack */`,
		`const bare = "${OLD}"; // ${FIXTURE_MARKER}`,
		`const next = "${NEW}";`,
	]);
	assert.deepEqual(findLiterals(fixture).map((entry) => entry.line), [3, 4], "a marker without a reason admits its line, or a marked line admits its neighbour");

	// The role held: the same guard is green on the declared version, and stays green when the train moves it.
	for (const v of [OLD, NEW]) {
		assert.deepEqual(finalPin(NAME, packageOf(urlOf(v)), lockOf(urlOf(v)), v), { releaseUrl: urlOf(v), version: v, integrity: INTEGRITY });
	}

	// The role not held: red, both values named.
	assert.throws(() => finalPin(NAME, packageOf(urlOf(NEW)), lockOf(urlOf(NEW)), OLD), new RegExp(`${NAME} is installed at ${OLD.replace(/\./g, "\\.")} while package\\.json pins ${NEW.replace(/\./g, "\\.")}`));
	assert.throws(() => finalPin(NAME, packageOf(urlOf(NEW)), lockOf(urlOf(OLD)), NEW), /pnpm-lock\.yaml records no integrity for /);
	assert.throws(() => finalPin(NAME, packageOf(urlOf(NEW, `v${NEW}-rc.1`)), lockOf(urlOf(NEW, `v${NEW}-rc.1`)), NEW), /which is not the archive of a final release of schema-test/);
	assert.throws(() => finalPin(NAME, packageOf(urlOf(NEW).replace(`${NAME}-${NEW}`, `${NAME}-${OLD}`)), "", NEW), /not the archive of a final release/);
	assert.throws(() => finalPin(NAME, { dependencies: {} }, "", NEW), /schema-test is not a dependency of package\.json/);
} finally {
	rmSync(work, { recursive: true, force: true });
}

console.log("Guards-by-role harness passed.");
