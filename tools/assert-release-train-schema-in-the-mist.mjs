import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const releaseUrl = packageJson.dependencies["schema-in-the-mist"];
const lock = readFileSync("pnpm-lock.yaml", "utf8");
const resolution = lock.split("\n").find((line) => line.includes("resolution: {") && line.includes(releaseUrl));
const integrity = /integrity: ([^,}]+)/.exec(resolution)?.[1];
const version = /schema-in-the-mist-(\d+\.\d+\.\d+)\.tgz$/.exec(releaseUrl)?.[1];
const ref = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
const sha256 = createHash("sha256").update(Buffer.from(await (await fetch(releaseUrl)).arrayBuffer())).digest("hex");
const manifestPath = "tools/.release-train-schema-in-the-mist-test.json";
const evidencePath = `${manifestPath}.evidence.json`;
const before = { package: readFileSync("package.json", "utf8"), lock, status: spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" }).stdout };
const manifest = { candidate: { releaseUrl, sha256, integrity, finalTag: `v${version}` }, consumer: { role: "handbook", repository: "RebelliousSmile/obsidian-handbook", ref } };
try {
	writeFileSync(manifestPath, JSON.stringify(manifest));
	const passed = spawnSync("npm", ["run", "release-train:assert", "--", manifestPath], { encoding: "utf8", shell: process.platform === "win32" });
	assert.equal(passed.status, 0, passed.stderr);
	assert.deepEqual(JSON.parse(readFileSync(evidencePath, "utf8")), { status: "passed", artifact: { releaseUrl, sha256, integrity, version }, consumer: manifest.consumer });
	for (const candidate of [{ ...manifest.candidate, integrity: "sha512-forged" }, { ...manifest.candidate, releaseUrl: "https://example.invalid/redirect.tgz" }]) {
		writeFileSync(manifestPath, JSON.stringify({ ...manifest, candidate }));
		const failed = spawnSync("npm", ["run", "release-train:assert", "--", manifestPath], { encoding: "utf8", shell: process.platform === "win32" });
		assert.notEqual(failed.status, 0); assert.equal(existsSync(evidencePath), false);
	}
	assert.equal(readFileSync("package.json", "utf8"), before.package); assert.equal(readFileSync("pnpm-lock.yaml", "utf8"), before.lock);
	console.log("release-train schema-in-the-mist assertion: green");
} finally { if (existsSync(manifestPath)) rmSync(manifestPath); if (existsSync(evidencePath)) rmSync(evidencePath); }
