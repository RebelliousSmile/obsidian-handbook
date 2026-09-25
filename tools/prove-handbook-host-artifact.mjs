import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const EXPECTED_OBSIDIAN_VERSION = "1.13.7";
const SHA256 = /^[a-f0-9]{64}$/;

function run(command, arguments_, options = {}) {
	const result = spawnSync(command, arguments_, {
		encoding: "utf8",
		stdio: options.stdio ?? "pipe",
		env: options.env ?? process.env,
	});
	if (result.error) throw result.error;
	if (result.status !== 0) {
		const detail = `${result.stderr || ""}${result.stdout || ""}`.trim();
		throw new Error(`${command} ${arguments_.join(" ")} failed${detail ? `:\n${detail}` : ""}`);
	}
	return result;
}

export function proveHandbookHostArtifact() {
	const obsidian = process.env.HANDBOOK_E2E_OBSIDIAN;
	assert.ok(obsidian, "HANDBOOK_E2E_OBSIDIAN must identify the pinned Obsidian 1.13.7 executable");
	const output = mkdtempSync(join(tmpdir(), "handbook-host-artifact-"));
	try {
		run("pnpm", ["build"], { stdio: "inherit" });
		run("bash", ["tools/e2e/plugin-load-journey.sh"], {
			stdio: "inherit",
			env: {
				...process.env,
				HANDBOOK_E2E_OBSIDIAN: obsidian,
				HANDBOOK_E2E_EXPECTED_OBSIDIAN_VERSION: EXPECTED_OBSIDIAN_VERSION,
				HANDBOOK_E2E_OUTPUT_DIR: output,
			},
		});
		const report = JSON.parse(readFileSync(join(output, "REPORT.json"), "utf8"));
		assert.equal(report.status, "passed", "Obsidian plugin-load report did not pass");
		assert.equal(report.observedObsidianVersion, EXPECTED_OBSIDIAN_VERSION, "Obsidian runtime version disagrees with the release gate");
		assert.equal(report.plugin?.id, "obsidian-handbook", "host report identifies the wrong plugin");
		assert.match(report.plugin?.manifestVersion ?? "", /^\d+\.\d+\.\d+$/, "host report lacks a release manifest version");
		assert.deepEqual(Object.keys(report.assets ?? {}).sort(), ["main.js", "manifest.json", "styles.css"]);
		for (const digest of Object.values(report.assets)) assert.match(digest, SHA256, "host report contains an invalid asset SHA-256");
		return {
			status: "passed",
			checks: ["production-build", "obsidian-plugin-load"],
			obsidianVersion: report.observedObsidianVersion,
			plugin: report.plugin,
			assets: report.assets,
		};
	} finally {
		rmSync(output, { recursive: true, force: true });
	}
}
