import assert from "node:assert/strict";
import {
	emptyPackIntegrationAssets,
	packIntegrationReport,
} from "../src/features/packs/integration";
import { EMPTY_STYLE } from "../src/games/types";
import type { GameRegistration } from "../src/games/variants";

function registration(id: string, requires: string[] | undefined): GameRegistration {
	return {
		pack: { id, label: id, style: EMPTY_STYLE },
		installation: requires === undefined
			? undefined
			: { root: id, version: "1.0.0", minimumHandbookVersion: "0.0.1", requires },
	};
}

const ready = emptyPackIntegrationAssets("ready");
const missingResource = emptyPackIntegrationAssets("resource-gap");
missingResource.missingResources.push("resource-gap/assets/frame.png");

const report = packIntegrationReport([
	{ registration: registration("ready", ["block:pbta-playbook", "style:pbta"]), assets: ready },
	{ registration: registration("resource-gap", []), assets: missingResource },
	{ registration: registration("unknown", ["block:unknown"]), assets: emptyPackIntegrationAssets("unknown") },
	{ registration: registration("legacy", undefined), assets: emptyPackIntegrationAssets("legacy") },
]);

assert.equal(report.packs.length, 4, "every registered pack has a report row");
assert.equal(report.ready, 1, "the supported pack without gaps is ready");
assert.equal(report.attention, 3, "every named gap needs attention");
assert.deepEqual(report.packs[0].availableBlocks, ["block:pbta-playbook"]);
assert.deepEqual(report.packs[0].availableStyles, ["style:pbta"]);
assert.ok(report.packs[1].findings.some((finding) => finding.detail.endsWith("frame.png")), "missing resources name their path");
assert.ok(report.packs[2].findings.some((finding) => finding.kind === "unsupported-capability" && finding.detail === "block:unknown"), "unknown capabilities name the unsupported declaration");
assert.ok(report.packs[3].findings.some((finding) => finding.kind === "missing-manifest"), "registrations without a manifest are distinct from installed packs");

const empty = packIntegrationReport([]);
assert.deepEqual(empty, { packs: [], installed: 0, ready: 0, attention: 0 }, "an empty registry has an empty, explainable report");

console.log("Pack integration report passed: ready, resource gap, unsupported capability, and empty registry.");
