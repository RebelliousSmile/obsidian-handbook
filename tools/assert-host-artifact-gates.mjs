import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ci = readFileSync(".github/workflows/ci.yml", "utf8");
const release = readFileSync(".github/workflows/release.yml", "utf8");
const runner = readFileSync("tools/release-train-assert.mjs", "utf8");
const hostProof = readFileSync("tools/prove-handbook-host-artifact.mjs", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checksum = "e0d8e0a611624de8c9c7dcd8a9e648279fb0a0d552faa1312b7e4f3a5fa72663";

assert.equal(packageJson.scripts["e2e:plugin-load:linux"], "bash tools/e2e/plugin-load-journey.sh");

const focusedJob = /\n    plugin-load-linux:\n([\s\S]*?)\n    e2e-linux:/.exec(ci)?.[1];
assert.ok(focusedJob, "CI must carry a dedicated plugin-load-linux job");
assert.doesNotMatch(focusedJob, /if:\s*\$\{\{\s*false\s*\}\}/, "focused plugin-load CI job is disabled");
assert.match(focusedJob, new RegExp(checksum), "focused plugin-load CI job does not pin the Obsidian AppImage digest");
assert.match(focusedJob, /sha256sum -c/, "focused plugin-load CI job does not verify the Obsidian AppImage");
assert.match(focusedJob, /pnpm e2e:plugin-load:linux/, "focused plugin-load CI job does not run the production load journey");
assert.doesNotMatch(focusedJob, /continue-on-error/, "focused plugin-load CI job tolerates failure");

assert.match(release, new RegExp(checksum), "release workflow does not pin the Obsidian AppImage digest");
assert.match(release, /sha256sum -c/, "release workflow does not verify the Obsidian AppImage");
assert.doesNotMatch(release, /continue-on-error/, "release workflow tolerates a failed gate");
const tag = release.indexOf("Assert the tag matches the shipped manifest");
const smoke = release.indexOf("pnpm e2e:plugin-load:linux");
const publish = release.indexOf("Create release");
assert.ok(tag >= 0 && smoke > tag && publish > smoke, "release workflow must validate tag, load production plugin, then publish");

const provider = runner.indexOf("await assertion(manifestPath)");
const host = runner.indexOf("await proveHost()");
const evidence = runner.indexOf("writeEvidence(evidencePath, evidence)");
assert.ok(provider >= 0 && host > provider && evidence > host, "release-train runner must prove provider, then host, then write evidence");
assert.match(runner, /proveHost = dependencies\.proveHost \?\? proveHandbookHostArtifact/, "release-train public default is not the real host proof");
assert.doesNotMatch(runner, /process\.env\.[A-Z_]*COMMAND/, "release-train CLI exposes a command override");
assert.match(hostProof, /HANDBOOK_E2E_OBSIDIAN/, "host proof does not require an explicit Obsidian executable");
assert.match(hostProof, /\["commonjs-plugin-build", "obsidian-1\.13\.7-plugin-load"\]/, "host proof does not publish the canonical release-train checks");
assert.match(runner, /EVIDENCE_KEYS = \["candidate", "consumer", "journey", "lock", "protocol", "status"\]/, "release-train runner does not lock the master evidence shape");
assert.doesNotMatch(runner, /hostArtifact/, "release-train runner publishes a consumer-local evidence field");

console.log("Host-artifact gates are mandatory in CI, release, and protocol-1 evidence.");
