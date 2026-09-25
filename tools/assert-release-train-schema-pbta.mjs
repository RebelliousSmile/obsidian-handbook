import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { proveHandbookHostArtifact } from "./prove-handbook-host-artifact.mjs";
import { runReleaseTrain } from "./release-train-assert.mjs";

const manifestPath = "tools/.release-train-schema-pbta-test.json";
const evidencePath = `${manifestPath}.evidence.json`;
const ref = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
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
	journey: { id: "schema-pbta-candidate-adoption", status: "passed", checks: ["contract"] },
};
const host = {
	status: "passed",
	checks: ["production-build", "obsidian-plugin-load"],
	obsidianVersion: "1.13.7",
	plugin: { id: "obsidian-handbook", manifestVersion: "9.9.9" },
	assets: { "main.js": "1".repeat(64), "manifest.json": "2".repeat(64), "styles.css": "3".repeat(64) },
};
const dependencies = {
	providerAssertions: {
		"schema-pbta": async () => ({ proof: { proofs: ["contract"] }, evidencePath, evidence: providerEvidence }),
	},
	proveHost: async () => host,
};

try {
	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	const result = await runReleaseTrain(manifestPath, dependencies);
	assert.equal(result.evidencePath.endsWith(evidencePath), true);
	const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
	assert.deepEqual(evidence.journey.checks, ["contract", "production-build", "obsidian-plugin-load"]);
	assert.deepEqual(evidence.hostArtifact, {
		status: "passed",
		obsidianVersion: "1.13.7",
		plugin: host.plugin,
		assets: host.assets,
	});

	writeFileSync(evidencePath, '{"stale":true}\n');
	await assert.rejects(
		() => runReleaseTrain(manifestPath, { ...dependencies, proveHost: async () => { throw new Error("host failed"); } }),
		/host failed/,
	);
	assert.equal(existsSync(evidencePath), false, "failed host proof must remove stale evidence");

	const originalHost = process.env.HANDBOOK_E2E_OBSIDIAN;
	delete process.env.HANDBOOK_E2E_OBSIDIAN;
	try {
		assert.throws(() => proveHandbookHostArtifact(), /HANDBOOK_E2E_OBSIDIAN/);
	} finally {
		if (originalHost === undefined) delete process.env.HANDBOOK_E2E_OBSIDIAN;
		else process.env.HANDBOOK_E2E_OBSIDIAN = originalHost;
	}
} finally {
	rmSync(manifestPath, { force: true });
	rmSync(evidencePath, { force: true });
}

console.log("release-train PbtA provider and host orchestration assertions passed");
