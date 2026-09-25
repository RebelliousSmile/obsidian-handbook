import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { runReleaseTrain } from "./release-train-assert.mjs";

const manifestPath = "tools/.release-train-schema-adrenaline-test.json";
const evidencePath = `${manifestPath}.evidence.json`;
const ref = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
const candidate = {
	provider: "schema-adrenaline",
	releaseUrl: "https://github.com/RebelliousSmile/schema-adrenaline/releases/download/v2.5.0-rc.2/schema-adrenaline-2.5.0.tgz",
	sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
	integrity: "sha512-Z9W4bGAvrvNslsikxeTQqgTJehQ/LMrNMBOzs95TVJhxiPzpO0VeVEF53OJgWxb+85Iwc9skl3V0ugWNA08Kcw==",
	version: "2.5.0",
	stagingTag: "v2.5.0-rc.2",
	finalTag: "v2.5.0",
	providerCommit: "0123456789abcdef0123456789abcdef01234567",
};
const manifest = {
	protocol: 1,
	candidate,
	consumers: [
		{ role: "lantern", repository: "RebelliousSmile/lantern", ref: "1234567890abcdef1234567890abcdef12345678" },
		{ role: "handbook", repository: "RebelliousSmile/obsidian-handbook", ref },
	],
};
const providerEvidence = {
	protocol: 1,
	status: "passed",
	candidate,
	consumer: { role: "handbook", repository: "RebelliousSmile/obsidian-handbook", ref, resolved: { version: candidate.version, releaseUrl: candidate.releaseUrl, integrity: candidate.integrity } },
	lock: { file: "pnpm-lock.yaml", releaseUrl: candidate.releaseUrl, integrity: candidate.integrity },
	journey: { id: "schema-adrenaline-candidate-adoption", status: "passed", checks: ["contract"] },
};
const host = {
	status: "passed",
	checks: ["commonjs-plugin-build", "obsidian-1.13.7-plugin-load"],
	obsidianVersion: "1.13.7",
	plugin: { id: "obsidian-handbook", manifestVersion: "9.9.9" },
	assets: { "main.js": "1".repeat(64), "manifest.json": "2".repeat(64), "styles.css": "3".repeat(64) },
};
const evidenceKeys = ["candidate", "consumer", "journey", "lock", "protocol", "status"];
const dependencies = {
	providerAssertions: {
		"schema-adrenaline": async () => ({ proof: { proofs: ["contract"] }, evidencePath, evidence: providerEvidence }),
	},
	proveHost: async () => host,
};

async function expectFailure(overrides, pattern) {
	writeFileSync(evidencePath, '{"stale":true}\n');
	await assert.rejects(() => runReleaseTrain(manifestPath, { ...dependencies, ...overrides }), pattern);
	assert.equal(existsSync(evidencePath), false, "failed compatibility proof must remove stale evidence");
}

try {
	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	await runReleaseTrain(manifestPath, dependencies);
	const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
	assert.deepEqual(Object.keys(evidence).sort(), evidenceKeys);
	assert.deepEqual(evidence.journey.checks, ["contract", "commonjs-plugin-build", "obsidian-1.13.7-plugin-load"]);
	assert.equal("hostArtifact" in evidence, false);

	await expectFailure({ proveHost: async () => ({ ...host, checks: ["production-build", "obsidian-plugin-load"] }) }, /noncanonical check identifiers/);
	await expectFailure({ proveHost: async () => ({ ...host, checks: ["commonjs-plugin-build"] }) }, /noncanonical check identifiers/);
	await expectFailure({
		providerAssertions: {
			"schema-adrenaline": async () => ({
				proof: { proofs: ["contract"] },
				evidencePath,
				evidence: { ...providerEvidence, hostArtifact: host },
			}),
		},
	}, /closed protocol-1 shape/);
	await expectFailure({
		providerAssertions: {
			"schema-adrenaline": async () => ({
				proof: { proofs: ["contract"] },
				evidencePath,
				evidence: {
					...providerEvidence,
					journey: { ...providerEvidence.journey, checks: ["contract", "obsidian-1.13.7-plugin-load"] },
				},
			}),
		},
	}, /checks must be unique/);
	await expectFailure({ proveHost: async () => { throw new Error("host failed"); } }, /host failed/);
} finally {
	rmSync(manifestPath, { force: true });
	rmSync(evidencePath, { force: true });
}

console.log("release-train Adrenaline provider and host orchestration assertions passed");
