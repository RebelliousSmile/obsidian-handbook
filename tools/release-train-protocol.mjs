import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = resolve(".");
const SHA256 = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const FINAL_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;
const STAGING_TAG = /^v(\d+)\.(\d+)\.(\d+)-rc\.\d+$/;
const CONSUMERS = {
	lantern: "RebelliousSmile/lantern",
	handbook: "RebelliousSmile/obsidian-handbook",
};

function object(value, label) {
	assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
	return value;
}

function text(value, label) {
	assert.equal(typeof value, "string", `${label} must be a string`);
	assert.ok(value.length > 0, `${label} must not be empty`);
	return value;
}

function exactKeys(value, keys, label) {
	assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} has unexpected or missing fields`);
}

function version(tag, pattern, label) {
	const match = pattern.exec(tag);
	assert.ok(match, `${label} must be a valid release tag`);
	return `${match[1]}.${match[2]}.${match[3]}`;
}

export function resolveManifestPath(argument) {
	assert.ok(argument && !isAbsolute(argument), "release-train manifest must be one relative path");
	const path = resolve(argument);
	const fromRoot = relative(ROOT, path);
	assert.ok(fromRoot && fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`), "release-train manifest must stay inside the Handbook checkout");
	assert.ok(existsSync(path), "release-train manifest does not exist");
	return path;
}

function readCandidate(value) {
	const source = object(value, "candidate");
	exactKeys(source, ["provider", "releaseUrl", "sha256", "integrity", "version", "stagingTag", "finalTag", "providerCommit"], "candidate");
	assert.equal(source.provider, "schema-pbta", "candidate.provider must be schema-pbta");
	const releaseUrl = text(source.releaseUrl, "candidate.releaseUrl");
	const sha256 = text(source.sha256, "candidate.sha256");
	const integrity = text(source.integrity, "candidate.integrity");
	const candidateVersion = text(source.version, "candidate.version");
	const stagingTag = text(source.stagingTag, "candidate.stagingTag");
	const finalTag = text(source.finalTag, "candidate.finalTag");
	const providerCommit = text(source.providerCommit, "candidate.providerCommit");
	assert.match(sha256, SHA256, "candidate.sha256 must be a lowercase SHA-256");
	assert.match(integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/, "candidate.integrity must be an npm SHA-512 SRI value");
	assert.match(providerCommit, COMMIT, "candidate.providerCommit must be a full commit SHA");
	const finalVersion = version(finalTag, FINAL_TAG, "candidate.finalTag");
	assert.equal(candidateVersion, finalVersion, "candidate.version must match candidate.finalTag");
	assert.equal(version(stagingTag, STAGING_TAG, "candidate.stagingTag"), finalVersion, "candidate tags must name the same final version");
	const url = new URL(releaseUrl);
	assert.equal(url.protocol, "https:", "candidate.releaseUrl must use HTTPS");
	assert.equal(url.hostname, "github.com", "candidate.releaseUrl must be a GitHub release asset");
	assert.equal(url.pathname, `/RebelliousSmile/schema-pbta/releases/download/${stagingTag}/schema-pbta-${finalVersion}.tgz`, "candidate.releaseUrl must identify the staged final-version archive");
	assert.equal(url.search, "", "candidate.releaseUrl must not carry mutable query parameters");
	assert.equal(url.hash, "", "candidate.releaseUrl must not carry a fragment");
	return { provider: "schema-pbta", releaseUrl, sha256, integrity, version: candidateVersion, stagingTag, finalTag, providerCommit };
}

function readConsumers(value) {
	assert.ok(Array.isArray(value) && value.length === 2, "consumers must name Lantern and Handbook exactly once");
	const consumers = value.map((entry, index) => {
		const source = object(entry, `consumers[${index}]`);
		exactKeys(source, ["role", "repository", "ref"], `consumers[${index}]`);
		const role = text(source.role, `consumers[${index}].role`);
		assert.ok(Object.hasOwn(CONSUMERS, role), `consumers[${index}].role must be lantern or handbook`);
		const repository = text(source.repository, `consumers[${index}].repository`);
		assert.equal(repository, CONSUMERS[role], `consumers[${index}] must name the canonical ${role} GitHub identity`);
		const ref = text(source.ref, `consumers[${index}].ref`);
		assert.match(ref, COMMIT, `consumers[${index}].ref must be a full commit SHA`);
		return { role, repository, ref };
	});
	assert.deepEqual(consumers.map((consumer) => consumer.role).sort(), Object.keys(CONSUMERS).sort(), "consumers must name Lantern and Handbook exactly once");
	return consumers;
}

function gitHead() {
	const result = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
	assert.equal(result.status, 0, `could not resolve Handbook HEAD: ${result.stderr.trim()}`);
	return result.stdout.trim();
}

export function readProtocolManifest(manifestPath) {
	const source = object(JSON.parse(readFileSync(manifestPath, "utf8")), "release train");
	exactKeys(source, ["protocol", "candidate", "consumers"], "release train");
	assert.equal(source.protocol, 1, "release train protocol must be 1");
	return {
		protocol: 1,
		candidate: readCandidate(source.candidate),
		consumers: readConsumers(source.consumers),
		evidencePath: `${manifestPath}.evidence.json`,
	};
}

export function resolveHandbookConsumer(manifest) {
	const consumer = manifest.consumers.find((entry) => entry.role === "handbook");
	assert.ok(consumer, "manifest does not identify Handbook");
	assert.equal(consumer.ref, gitHead(), "manifest Handbook ref does not resolve to checked-out HEAD");
	return consumer;
}
