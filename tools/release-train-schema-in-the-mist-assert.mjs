import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readProtocolManifest, resolveHandbookConsumer } from "./release-train-protocol.mjs";

function run(command, args) {
	const result = spawnSync(command, args, { encoding: "utf8", stdio: "pipe", timeout: 300000 });
	assert.equal(result.status, 0, `${command} ${args.join(" ")} failed: ${result.error?.message || result.stderr || result.stdout}`);
}

export async function assertSchemaInTheMistReleaseTrain(manifestPath) {
	const manifest = readProtocolManifest(manifestPath);
	assert.equal(manifest.protocol, 2);
	const consumer = resolveHandbookConsumer(manifest);
	const { artifact } = manifest;
	const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
	assert.equal(packageJson.dependencies[artifact.provider], artifact.releaseUrl, "Handbook package pin differs from final artifact");
	const lock = readFileSync("pnpm-lock.yaml", "utf8");
	const resolution = lock.split("\n").find((line) => line.includes("resolution: {") && line.includes(artifact.releaseUrl));
	assert.ok(resolution?.includes(`integrity: ${artifact.integrity}`), "Handbook lock pin differs from final artifact");
	assert.equal(JSON.parse(readFileSync("node_modules/schema-in-the-mist/package.json", "utf8")).version, artifact.version);
	const response = await fetch(artifact.releaseUrl);
	assert.ok(response.ok, `final release download failed: ${response.status}`);
	assert.equal(createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex"), artifact.sha256);
	run("pnpm", ["build"]);
	for (const script of ["tools/assert-mist-contract.mjs", "tools/assert-mist-font-packs.mjs", "tools/assert-source-installer.mjs"]) run(process.execPath, [script]);
	// This existing journey launches the production bundle in an isolated real Obsidian
	// vault and waits for app.plugins.plugins['obsidian-handbook'] to load.
	run("powershell", ["-ExecutionPolicy", "Bypass", "-File", "tools/e2e/layout-regions-journey.ps1"]);
	const evidence = {
		protocol: 2, status: "passed",
		artifact: { releaseUrl: artifact.releaseUrl, sha256: artifact.sha256, integrity: artifact.integrity, version: artifact.version },
		consumer: { role: consumer.role, repository: consumer.repository, ref: consumer.ref },
		lock: { file: "pnpm-lock.yaml", releaseUrl: artifact.releaseUrl, integrity: artifact.integrity },
		journey: { id: "schema-in-the-mist-final-adoption", status: "passed", checks: ["contract", "pack-assets", "source-installer", "production-build", "obsidian-plugin-load"] },
	};
	const temporary = `${manifest.evidencePath}.${process.pid}.tmp`;
	writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`);
	renameSync(temporary, manifest.evidencePath);
	return { evidencePath: manifest.evidencePath, evidence };
}
