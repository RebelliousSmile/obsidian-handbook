import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const releaseUrl = JSON.parse(readFileSync("package.json", "utf8")).dependencies["schema-pbta"];
const resolution = readFileSync("pnpm-lock.yaml", "utf8").split("\n").find((line) => line.includes("resolution: {") && line.includes(releaseUrl));
const integrity = /integrity: ([^,}]+)/.exec(resolution)?.[1];
const version = releaseUrl.slice(releaseUrl.lastIndexOf("-") + 1, -4);
const ref = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
const sha256 = createHash("sha256").update(Buffer.from(await (await fetch(releaseUrl)).arrayBuffer())).digest("hex");
const manifestPath = "tools/.release-train-schema-pbta-test.json";
const evidencePath = `${manifestPath}.evidence.json`;
const manifest = { candidate: { releaseUrl, sha256, integrity, finalTag: `v${version}` }, consumer: { role: "handbook", repository: "RebelliousSmile/obsidian-handbook", ref } };
try {
	writeFileSync(manifestPath, JSON.stringify(manifest));
	const passed = spawnSync("pnpm", ["run", "release-train:assert", "--", manifestPath], { encoding: "utf8", shell: process.platform === "win32" });
	assert.equal(passed.status, 0, passed.stderr);
	assert.deepEqual(JSON.parse(readFileSync(evidencePath, "utf8")), { status: "passed", artifact: { releaseUrl, sha256, integrity }, consumer: manifest.consumer });
	writeFileSync(evidencePath, JSON.stringify({ status: "passed" }));
	manifest.candidate.integrity = "sha512-forged"; writeFileSync(manifestPath, JSON.stringify(manifest));
	const rejected = spawnSync("pnpm", ["run", "release-train:assert", "--", manifestPath], { encoding: "utf8", shell: process.platform === "win32" });
	assert.notEqual(rejected.status, 0);
	assert.equal(existsSync(evidencePath), false, "a rejected manifest leaves no evidence");
	console.log("release-train schema-pbta assertion: green");
} finally { if (existsSync(manifestPath)) rmSync(manifestPath); if (existsSync(evidencePath)) rmSync(evidencePath); }
