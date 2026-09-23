import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const releaseUrl = JSON.parse(readFileSync("package.json", "utf8")).dependencies["schema-pbta"];
const sha256 = "bca28c7ff3033640efb570fb6c21a05ec79d82c6fb193560d504bd71d3c457ea";
const expectedIntegrity = "sha512-sKof+MqPI1XMuXc2vdvTtPQxpdrF00uDfC45nWzfMJxW80Mr286YqLTeAXSO21ptgZsh9qVnFECUhd8ALuIAoQ==";
const lockLine = readFileSync("pnpm-lock.yaml", "utf8")
  .split("\n")
  .find((line) => line.includes("resolution: {") && line.includes(releaseUrl));
const integrity = /integrity: ([^,}]+)/.exec(lockLine)?.[1];
const ref = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
const manifestPath = "tools/.release-train-schema-pbta-test.json";
const evidencePath = `${manifestPath}.evidence.json`;

assert.equal(releaseUrl, "https://github.com/RebelliousSmile/schema-pbta/releases/download/v8.4.2-rc.1/schema-pbta-8.4.2.tgz");
assert.equal(integrity, expectedIntegrity);

const response = await fetch(releaseUrl);
assert.equal(response.ok, true, `could not download candidate archive: ${response.status}`);
const downloadedSha256 = createHash("sha256")
  .update(Buffer.from(await response.arrayBuffer()))
  .digest("hex");
assert.equal(downloadedSha256, sha256);

const candidate = {
  provider: "schema-pbta",
  releaseUrl,
  sha256,
  integrity,
  version: "8.4.2",
  stagingTag: "v8.4.2-rc.1",
  finalTag: "v8.4.2",
  providerCommit: "83af3354175acd50f4e2bb9ea9bb07ff15529417",
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
  assert.equal(evidence.consumer.resolved.version, "8.4.2");
  assert.equal(evidence.journey.status, "passed");

  for (const invalidManifest of [
	{ ...manifest, evidencePath },
    { ...manifest, candidate: { ...candidate, sha256: "0".repeat(64) } },
    { ...manifest, candidate: { ...candidate, integrity: "sha512-invalid" } },
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

console.log("release-train protocol-1 schema-pbta integration assertions passed");
