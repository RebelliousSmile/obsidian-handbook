import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const releaseUrl = JSON.parse(readFileSync("package.json", "utf8")).dependencies["schema-adrenaline"];
const sha256 = "62033e75384f17ee21e4e5e76d231b84c25b3fdcb0d5de74ecdbc89c94be95cc";
const expectedIntegrity = "sha512-cb/ZUmHy5LYaMQPmit7tRQIybBQWW8fFN4fgeaHZYoSZHKFuQJgIFVc3p/BhgRVhT00dT7r9DZCk7gmPMTpkjQ==";
const lockLine = readFileSync("pnpm-lock.yaml", "utf8")
	.split("\n")
	.find((line) => line.includes("resolution: {") && line.includes(releaseUrl));
const integrity = /integrity: ([^,}]+)/.exec(lockLine)?.[1];
const ref = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
const sourceRoot = resolve("../schema-adrenaline");
const manifestPath = "tools/.release-train-schema-adrenaline-test.json";
const evidencePath = `${manifestPath}.evidence.json`;

assert.equal(releaseUrl, "https://github.com/RebelliousSmile/schema-adrenaline/releases/download/v2.5.0-rc.2/schema-adrenaline-2.5.0.tgz");
assert.equal(integrity, expectedIntegrity);
assert.equal(spawnSync("git", ["-C", sourceRoot, "rev-parse", "v2.5.0-rc.2^{commit}"], { encoding: "utf8" }).stdout.trim(), "31c4576bc45e1fc16e4bf6592d3f3d62e7cf8b58");

const response = await fetch(releaseUrl);
assert.equal(response.ok, true, `could not download candidate archive: ${response.status}`);
const downloadedSha256 = createHash("sha256")
	.update(Buffer.from(await response.arrayBuffer()))
	.digest("hex");
assert.equal(downloadedSha256, sha256);

const candidate = {
	provider: "schema-adrenaline",
	releaseUrl,
	sha256,
	integrity,
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
		{ role: "handbook", repository: "RebelliousSmile/obsidian-handbook", ref },
	],
};

function writeManifest(value) {
	writeFileSync(manifestPath, `${JSON.stringify(value, null, 2)}\n`);
}

function runReleaseTrain() {
	return spawnSync("pnpm", ["run", "release-train:assert", manifestPath], {
		encoding: "utf8",
		env: { ...process.env, SCHEMA_ADRENALINE_ROOT: sourceRoot },
		shell: process.platform === "win32",
	});
}

try {
	writeManifest(manifest);
	const success = runReleaseTrain();
	assert.equal(success.status, 0, success.stderr || success.stdout);

	const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
	assert.deepEqual(evidence.candidate, candidate);
	assert.deepEqual(evidence.lock, {
		file: "pnpm-lock.yaml",
		releaseUrl,
		integrity,
	});
	assert.equal(evidence.consumer.ref, ref);
	assert.equal(evidence.consumer.resolved.version, "2.5.0");
	assert.deepEqual(evidence.journey, {
		id: "schema-adrenaline-candidate-adoption",
		status: "passed",
		checks: ["documents", "contract", "source-catalog", "capability-gating"],
	});

	for (const invalidManifest of [
		{ ...manifest, evidencePath },
		{ ...manifest, candidate: { ...candidate, sha256: "0".repeat(64) } },
		{ ...manifest, candidate: { ...candidate, integrity: "sha512-invalid" } },
		{ ...manifest, candidate: { ...candidate, providerCommit: "0".repeat(40) } },
		{
			...manifest,
			consumers: [
				manifest.consumers[0],
				{ ...manifest.consumers[1], ref: "0".repeat(40) },
			],
		},
	]) {
		writeManifest(invalidManifest);
		writeFileSync(evidencePath, '{"stale":true}\n');
		const rejected = runReleaseTrain();
		assert.notEqual(rejected.status, 0, "release-train must reject an invalid protocol-1 manifest");
		assert.equal(existsSync(evidencePath), false, "failed proof must not retain stale evidence");
	}
} finally {
	rmSync(manifestPath, { force: true });
	rmSync(evidencePath, { force: true });
}

console.log("release-train protocol-1 schema-adrenaline integration assertions passed");
