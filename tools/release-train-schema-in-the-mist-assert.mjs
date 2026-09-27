import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readProtocolManifest, resolveHandbookConsumer } from "./release-train-protocol.mjs";
import { proveSchemaInTheMistCandidate } from "./prove-schema-in-the-mist-candidate.mjs";

function run(command, args, env = process.env) {
	const result = spawnSync(command, args, { encoding: "utf8", stdio: "pipe", timeout: 300000, env });
	assert.equal(result.status, 0, `${command} ${args.join(" ")} failed: ${result.error?.message || result.stderr || result.stdout}`);
}

export function readMistCandidateManifest(manifestPath) {
	const source = JSON.parse(readFileSync(manifestPath, "utf8"));
	assert.deepEqual(Object.keys(source).sort(), ["candidate", "consumer"], "Mist candidate manifest fields differ from the provider proof interface");
	const { candidate, consumer } = source;
	assert.deepEqual(Object.keys(candidate).sort(), ["finalTag", "integrity", "packageName", "releaseUrl", "sha256"].sort());
	assert.equal(candidate.packageName, "schema-in-the-mist");
	assert.match(candidate.finalTag, /^v\d+\.\d+\.\d+$/);
	assert.match(candidate.sha256, /^[a-f0-9]{64}$/);
	assert.match(candidate.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/);
	const url = new URL(candidate.releaseUrl);
	assert.equal(url.protocol, "https:");
	assert.equal(url.hostname, "github.com");
	assert.match(url.pathname, /^\/RebelliousSmile\/schema-in-the-mist\/releases\/download\/v(\d+\.\d+\.\d+)-rc\.\d+\/schema-in-the-mist-\1\.tgz$/);
	assert.equal(url.search, "");
	assert.equal(url.hash, "");
	assert.equal(candidate.finalTag, `v${/schema-in-the-mist-(\d+\.\d+\.\d+)\.tgz$/.exec(url.pathname)[1]}`);
	assert.deepEqual(Object.keys(consumer).sort(), ["ref", "repository", "role"]);
	assert.equal(consumer.role, "handbook");
	assert.equal(consumer.repository, "RebelliousSmile/obsidian-handbook");
	assert.match(consumer.ref, /^[a-f0-9]{40}$/);
	const head = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
	assert.equal(head.status, 0, "could not resolve Handbook HEAD");
	assert.equal(consumer.ref, head.stdout.trim(), "Mist candidate manifest Handbook ref differs from checked-out HEAD");
	return { candidate, consumer };
}

async function assertMistCandidate(manifestPath) {
	const { candidate, consumer } = readMistCandidateManifest(manifestPath);
	const response = await fetch(candidate.releaseUrl);
	assert.ok(response.ok, `Mist candidate archive download failed: ${response.status}`);
	const bytes = Buffer.from(await response.arrayBuffer());
	assert.equal(createHash("sha256").update(bytes).digest("hex"), candidate.sha256);
	assert.equal(`sha512-${createHash("sha512").update(bytes).digest("base64")}`, candidate.integrity);
	proveSchemaInTheMistCandidate(candidate);
	const evidence = {
		status: "passed",
		artifact: { releaseUrl: candidate.releaseUrl, sha256: candidate.sha256, integrity: candidate.integrity, version: candidate.finalTag.slice(1) },
		consumer,
	};
	const evidencePath = `${manifestPath}.evidence.json`;
	const temporary = `${evidencePath}.${process.pid}.tmp`;
	writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`);
	renameSync(temporary, evidencePath);
	return { evidencePath, evidence };
}

export async function assertSchemaInTheMistReleaseTrain(manifestPath) {
	const source = JSON.parse(readFileSync(manifestPath, "utf8"));
	if (source.candidate?.packageName === "schema-in-the-mist" && source.protocol === undefined) return assertMistCandidate(manifestPath);
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
	// Launch the production bundle in an isolated real Obsidian vault and wait
	// for app.plugins.plugins['obsidian-handbook'] to exist inside the host.
	run("powershell", ["-ExecutionPolicy", "Bypass", "-File", "tools/e2e/layout-regions-journey.ps1"], { ...process.env, HANDBOOK_E2E_LOAD_ONLY: "1" });
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
