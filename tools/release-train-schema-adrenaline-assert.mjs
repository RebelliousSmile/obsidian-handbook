/* global Buffer, fetch, process */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PROVIDER = "RebelliousSmile/schema-adrenaline";
const CONSUMER = "RebelliousSmile/obsidian-handbook";
const SHA256 = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const TAG = /^v(\d+\.\d+\.\d+)$/;

function run(script) {
  const result = spawnSync("npm", ["run", "--silent", script], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  assert.equal(result.status, 0, `${script} failed: ${result.stderr || result.stdout}`);
}

function text(value, name) {
  assert.equal(typeof value, "string", `${name} must be text`);
  assert.ok(value.length > 0, `${name} must not be empty`);
  return value;
}

export async function assertSchemaAdrenalineReleaseTrain(manifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.deepEqual(Object.keys(manifest).sort(), ["consumers", "manifestVersion", "provider"]);
  assert.equal(manifest.manifestVersion, 1);
  const provider = manifest.provider;
  assert.deepEqual(Object.keys(provider).sort(), ["archiveUrl", "commit", "finalTag", "repository", "sha256"]);
  assert.equal(provider.repository, PROVIDER);
  const archiveUrl = text(provider.archiveUrl, "provider.archiveUrl");
  assert.ok(archiveUrl.startsWith("https://"), "provider.archiveUrl must be HTTPS");
  const sha256 = text(provider.sha256, "provider.sha256");
  assert.match(sha256, SHA256, "provider.sha256 must be SHA-256");
  const tag = text(provider.finalTag, "provider.finalTag");
  const version = TAG.exec(tag)?.[1];
  assert.ok(version, "provider.finalTag must be SemVer");
  assert.ok(archiveUrl.endsWith(`schema-adrenaline-${version}.tgz`), "archive filename disagrees with final tag");

  const consumer = manifest.consumers?.handbook;
  assert.deepEqual(Object.keys(manifest.consumers).sort(), ["handbook", "lantern"]);
  assert.deepEqual(Object.keys(consumer).sort(), ["commit", "repository"]);
  assert.equal(consumer.repository, CONSUMER);
  assert.match(consumer.commit, COMMIT, "handbook commit must be a full SHA");
  const head = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
  assert.equal(head, consumer.commit, "manifest Handbook commit differs from checked-out HEAD");

  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(packageJson.dependencies["schema-adrenaline"], archiveUrl, "package pin differs from candidate");
  const lock = readFileSync("pnpm-lock.yaml", "utf8");
  const resolution = lock.split("\n").find((line) => line.includes("resolution: {") && line.includes(archiveUrl));
  assert.ok(resolution?.includes("integrity: sha512-"), "lockfile lacks candidate SRI");
  const installed = JSON.parse(readFileSync("node_modules/schema-adrenaline/package.json", "utf8"));
  assert.equal(installed.version, version, "installed Adrenaline version differs from candidate");

  const response = await fetch(archiveUrl);
  assert.ok(response.ok, `candidate download failed: ${response.status}`);
  const actual = createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex");
  assert.equal(actual, sha256, "candidate bytes differ from manifest SHA-256");

  run("assert:adrenaline-documents");
  run("assert:adrenaline-contract");
  run("assert:adrenaline-theme");
  return {
    status: "passed",
    version,
    archiveUrl,
    integrity: `sha256-${sha256}`,
    commit: consumer.commit,
    path: "catalogue-pack-render",
  };
}
