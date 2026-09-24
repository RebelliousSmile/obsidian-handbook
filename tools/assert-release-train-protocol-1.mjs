import assert from "node:assert/strict";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readProtocolManifest, resolveHandbookConsumer, resolveManifestPath } from "./release-train-protocol.mjs";

const manifestArgument = "tools/.release-train-protocol-1-test.json";
const head = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
const candidate = {
	provider: "schema-pbta",
	releaseUrl: "https://github.com/RebelliousSmile/schema-pbta/releases/download/v8.4.2-rc.1/schema-pbta-8.4.2.tgz",
	sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
	integrity: "sha512-Z9W4bGAvrvNslsikxeTQqgTJehQ/LMrNMBOzs95TVJhxiPzpO0VeVEF53OJgWxb+85Iwc9skl3V0ugWNA08Kcw==",
	version: "8.4.2",
	stagingTag: "v8.4.2-rc.1",
	finalTag: "v8.4.2",
	providerCommit: "0123456789abcdef0123456789abcdef01234567",
};
const adrenalineCandidate = {
	provider: "schema-adrenaline",
	releaseUrl: "https://github.com/RebelliousSmile/schema-adrenaline/releases/download/v2.5.0-rc.2/schema-adrenaline-2.5.0.tgz",
	sha256: "62033e75384f17ee21e4e5e76d231b84c25b3fdcb0d5de74ecdbc89c94be95cc",
	integrity: candidate.integrity,
	version: "2.5.0",
	stagingTag: "v2.5.0-rc.2",
	finalTag: "v2.5.0",
	providerCommit: "31c4576bc45e1fc16e4bf6592d3f3d62e7cf8b58",
};
const manifest = {
	protocol: 1,
	candidate,
	consumers: [
		{ role: "lantern", repository: "RebelliousSmile/lantern", ref: "1234567890abcdef1234567890abcdef12345678" },
		{ role: "handbook", repository: "RebelliousSmile/obsidian-handbook", ref: head },
	],
};
const evidencePath = `${manifestArgument}.evidence.json`;

try {
	writeFileSync(manifestArgument, JSON.stringify(manifest));
	const manifestPath = resolveManifestPath(manifestArgument);
	const parsed = readProtocolManifest(manifestPath);
	assert.deepEqual(resolveHandbookConsumer(parsed), manifest.consumers[1]);
	assert.equal(parsed.evidencePath, `${manifestPath}.evidence.json`);
	writeFileSync(manifestArgument, JSON.stringify({ ...manifest, candidate: adrenalineCandidate }));
	assert.equal(readProtocolManifest(resolveManifestPath(manifestArgument)).candidate.provider, "schema-adrenaline");
	for (const invalid of [
		{ ...manifest, protocol: 2 },
		{ ...manifest, candidate: { ...adrenalineCandidate, provider: "schema-unknown" } },
		{ ...manifest, candidate: { ...adrenalineCandidate, releaseUrl: candidate.releaseUrl.replace("v8.4.2", "v2.5.0").replace("schema-pbta", "schema-adrenaline") } },
		{ ...manifest, candidate: { ...adrenalineCandidate, stagingTag: "v2.5.0-rc.3" } },
		{ ...manifest, candidate: { ...adrenalineCandidate, version: "2.5.1" } },
		{ ...manifest, candidate: { ...adrenalineCandidate, sha256: "A".repeat(64) } },
		{ ...manifest, candidate: { ...adrenalineCandidate, providerCommit: "0".repeat(39) } },
		{ ...manifest, candidate: { ...candidate, releaseUrl: candidate.releaseUrl.replace("rc.1", "rc.2") } },
		{ ...manifest, consumers: manifest.consumers.slice(0, 1) },
		{ ...manifest, consumers: manifest.consumers.map((consumer) => ({ ...consumer, ref: "main" })) },
		{ ...manifest, evidencePath: `${manifestArgument}.evidence.json` },
	]) {
		writeFileSync(manifestArgument, JSON.stringify(invalid));
		assert.throws(() => readProtocolManifest(resolveManifestPath(manifestArgument)));
	}
	assert.equal(existsSync(evidencePath), false);
	console.log("release-train protocol-1 assertion: green");
} finally {
	if (existsSync(manifestArgument)) rmSync(manifestArgument);
	if (existsSync(evidencePath)) rmSync(evidencePath);
}
