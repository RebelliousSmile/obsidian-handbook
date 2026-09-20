import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* Why this exists: `manifest.json`, `package.json` and `versions.json` sat at 2.15.3 while the tags
   went to v2.19.1, so four releases shipped a plugin that told Obsidian it was 2.15.3 — no update
   ever offered, whatever the tag said. Nothing could notice, because the three files agreed with each
   other and only disagreed with the tag and the changelog. The version lives in four places; this
   asserts they are one version. */

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const versions = JSON.parse(readFileSync("versions.json", "utf8"));

const version = manifest.version;
assert.match(version, /^\d+\.\d+\.\d+$/, `manifest.json version ${version} is not a release version`);
assert.equal(
	packageJson.version,
	version,
	`package.json is at ${packageJson.version} and manifest.json at ${version}: run \`pnpm version <x.y.z>\`, ` +
		"which is what keeps version-bump.mjs in the loop",
);

/* Obsidian reads versions.json to decide whether this release runs on the reader's app at all: a
   version absent from it is a version no vault can resolve a minimum app version for. */
assert.equal(
	versions[version],
	manifest.minAppVersion,
	`versions.json maps ${version} to ${String(versions[version])}, manifest.json requires ${manifest.minAppVersion}`,
);

/* The changelog is written by hand at release time and the manifest by `pnpm version`. They drifted
   apart for four releases: whichever one is right, they cannot both be. */
const changelog = readFileSync("CHANGELOG.md", "utf8");
const documented = /^## \[(\d+\.\d+\.\d+)\]/m.exec(changelog);
assert.ok(documented, "CHANGELOG.md has no `## [x.y.z]` section to release");
assert.equal(
	documented[1],
	version,
	`CHANGELOG.md documents ${documented[1]} as the newest version and the manifest ships ${version}`,
);

/* Only the release workflow knows the tag, and it is the one place the mismatch actually ships. */
const tag = process.env.RELEASE_TAG ?? process.argv[2];
if (tag) {
	assert.equal(
		tag,
		`v${version}`,
		`tag ${tag} would publish a build whose manifest declares ${version}: Obsidian reads the manifest, not the tag`,
	);
}

console.log(
	`Release version passed: ${version} in manifest.json, package.json, versions.json (app ${manifest.minAppVersion}) ` +
		`and CHANGELOG.md${tag ? `, matching tag ${tag}` : ""}.`,
);
