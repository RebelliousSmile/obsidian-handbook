import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { buildCandidateEvidence, assertReleaseTrain } from "./release-train-schema-pbta-assert.mjs";

const releaseUrl = JSON.parse(readFileSync("package.json", "utf8")).dependencies["schema-pbta"];
const finalUrl = "https://github.com/RebelliousSmile/schema-pbta/releases/download/v8.4.3/schema-pbta-8.4.3.tgz";
const candidateUrl = "https://github.com/RebelliousSmile/schema-pbta/releases/download/v8.4.3-rc.1/schema-pbta-8.4.3.tgz";
const sha256 = "1aa889767d8b737c5c05248099ba79dd9d4c5e32ce99e27927bbafd1ee6b93c4";
const integrity = "sha512-ZMPKlxqMjZlfkLVQs/ufpGVBDtP9BXpee+C2hFX6ZknNSw7PMDPNIdCTmaXWe525kQouBpsi2HSrH0CguxxYaw==";
const lock = readFileSync("pnpm-lock.yaml", "utf8");
const resolution = lock.split("\n").find((line) => line.includes("resolution: {") && line.includes(`tarball: ${releaseUrl}`));

assert.equal(releaseUrl, finalUrl);
assert.ok(resolution?.includes(`integrity: ${integrity}`));
assert.equal(JSON.parse(readFileSync("node_modules/schema-pbta/package.json", "utf8")).version, "8.4.3");
const response = await fetch(finalUrl);
assert.equal(response.ok, true, `could not download final archive: ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
assert.equal(createHash("sha256").update(bytes).digest("hex"), sha256);
assert.equal(`sha512-${createHash("sha512").update(bytes).digest("base64")}`, integrity);

// Exercise the evidence envelope in memory. A final consumer pin cannot be
// rerun as a protocol-1 staged-candidate adoption without falsifying its lock.
const candidate = { provider: "schema-pbta", releaseUrl: candidateUrl, sha256, integrity, version: "8.4.3", stagingTag: "v8.4.3-rc.1", finalTag: "v8.4.3", providerCommit: "06181fbe1e5fc1c33f85d30edfae2e1cb6581db1" };
const consumer = { role: "handbook", repository: "RebelliousSmile/obsidian-handbook", ref: "a".repeat(40) };
const host = { obsidianVersion: "1.13.7", sha256: createHash("sha256").update(readFileSync("dist/main.js")).digest("hex") };
const evidence = buildCandidateEvidence({ candidate }, consumer, { proofs: ["contract", "source-installer"] }, host);
assert.equal(evidence.status, "passed");
assert.deepEqual(evidence.lock, { file: "pnpm-lock.yaml", releaseUrl: candidateUrl, integrity });
for (const check of ["production-build", "commonjs-plugin-build", "obsidian-load", "obsidian-1.13.7-plugin-load", `artifact-sha256:${host.sha256}`, "obsidian-version:1.13.7"]) {
	assert.ok(evidence.journey.checks.includes(check), `candidate evidence is missing ${check}`);
}
assert.throws(() => buildCandidateEvidence({ candidate }, consumer, { proofs: [] }, { ...host, obsidianVersion: "1.13.6" }), /pinned Obsidian/);

const manifestPath = "tools/.release-train-schema-pbta-test.json";
const evidencePath = `${manifestPath}.evidence.json`;
try {
	writeFileSync(manifestPath, '{"protocol":1,"unexpected":true}\n');
	writeFileSync(evidencePath, '{"stale":true}\n');
	await assert.rejects(() => assertReleaseTrain(manifestPath), /unexpected|missing/);
	assert.equal(existsSync(evidencePath), false, "invalid proof must remove stale passed evidence");
} finally {
	rmSync(manifestPath, { force: true });
	rmSync(evidencePath, { force: true });
}

console.log("release-train schema-pbta final pin and evidence assertions passed");
