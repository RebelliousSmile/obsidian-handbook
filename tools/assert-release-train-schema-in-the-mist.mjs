import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { proveSchemaInTheMistCandidate } from "./prove-schema-in-the-mist-candidate.mjs";
import { readMistCandidateManifest } from "./release-train-schema-in-the-mist-assert.mjs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const releaseUrl = packageJson.dependencies["schema-in-the-mist"];
const lock = readFileSync("pnpm-lock.yaml", "utf8");
const resolution = lock.split("\n").find((line) => line.includes("resolution: {") && line.includes(releaseUrl));
const integrity = /integrity: ([^,}]+)/.exec(resolution)?.[1];
const version = /schema-in-the-mist-(\d+\.\d+\.\d+)\.tgz$/.exec(releaseUrl)?.[1];

assert.equal(proveSchemaInTheMistCandidate({ releaseUrl, integrity, finalTag: `v${version}` }).version, version);
assert.throws(() => proveSchemaInTheMistCandidate({ releaseUrl, integrity: "sha512-forged", finalTag: `v${version}` }));
const candidateManifestPath = "tools/.mist-candidate-manifest-test.json";
const head = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
const candidate = {
	packageName: "schema-in-the-mist",
	releaseUrl: `https://github.com/RebelliousSmile/schema-in-the-mist/releases/download/v${version}-rc.1/schema-in-the-mist-${version}.tgz`,
	sha256: "a".repeat(64),
	integrity: `sha512-${"A".repeat(86)}==`,
	finalTag: `v${version}`,
};
const consumer = { role: "handbook", repository: "RebelliousSmile/obsidian-handbook", ref: head };
try {
	writeFileSync(candidateManifestPath, JSON.stringify({ candidate, consumer }));
	assert.deepEqual(readMistCandidateManifest(candidateManifestPath), { candidate, consumer });
	for (const invalid of [
		{ candidate: { ...candidate, releaseUrl: candidate.releaseUrl.replace("-rc.1", "") }, consumer },
		{ candidate: { ...candidate, finalTag: "v0.0.0" }, consumer }, // guard-fixture: a tag no release carries
		{ candidate, consumer: { ...consumer, ref: "0".repeat(40) } },
	]) {
		writeFileSync(candidateManifestPath, JSON.stringify(invalid));
		assert.throws(() => readMistCandidateManifest(candidateManifestPath));
	}
} finally {
	if (existsSync(candidateManifestPath)) rmSync(candidateManifestPath);
}
console.log("release-train Mist regression assertion: green");
