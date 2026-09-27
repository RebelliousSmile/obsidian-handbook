import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { proveSchemaAdrenalineCandidate } from "./prove-schema-adrenaline-candidate.mjs";
import { readProtocolManifest, resolveHandbookConsumer } from "./release-train-protocol.mjs";

async function archiveHashes(url) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`release download failed: ${response.status}`);
	const bytes = Buffer.from(await response.arrayBuffer());
	return { sha256: createHash("sha256").update(bytes).digest("hex"), integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}` };
}

function run(command, args, env = process.env) {
	const result = spawnSync(command, args, { encoding: "utf8", stdio: "pipe", timeout: 300000, env });
	assert.equal(result.status, 0, `${command} ${args.join(" ")} failed: ${result.error?.message || result.stderr || result.stdout}`);
}

function writeEvidence(path, evidence) {
	const temporary = `${path}.${process.pid}.tmp`;
	writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`);
	renameSync(temporary, path);
}

export async function assertSchemaAdrenalineReleaseTrain(manifestPath) {
	const defaultEvidencePath = `${manifestPath}.evidence.json`;
	if (existsSync(defaultEvidencePath)) rmSync(defaultEvidencePath);
	const manifest = readProtocolManifest(manifestPath);
	if (manifest.protocol === 2) return assertFinalAdoption(manifest);
	if (manifest.candidate.provider !== "schema-adrenaline") throw new Error("Adrenaline release-train assertion requires a schema-adrenaline candidate");
	const consumer = resolveHandbookConsumer(manifest);
	if ((await archiveHashes(manifest.candidate.releaseUrl)).sha256 !== manifest.candidate.sha256) throw new Error("candidate SHA-256 disagrees with release asset");
	const proof = proveSchemaAdrenalineCandidate(manifest.candidate);
	const evidence = {
		protocol: 1,
		status: "passed",
		candidate: manifest.candidate,
		consumer: { role: consumer.role, repository: consumer.repository, ref: consumer.ref, resolved: { version: manifest.candidate.version, releaseUrl: manifest.candidate.releaseUrl, integrity: manifest.candidate.integrity } },
		lock: { file: "pnpm-lock.yaml", releaseUrl: manifest.candidate.releaseUrl, integrity: manifest.candidate.integrity },
		journey: { id: "schema-adrenaline-candidate-adoption", status: "passed", checks: proof.proofs },
	};
	writeEvidence(defaultEvidencePath, evidence);
	return { proof, evidencePath: defaultEvidencePath, evidence };
}

async function assertFinalAdoption(manifest) {
	const { artifact } = manifest;
	assert.equal(artifact.provider, "schema-adrenaline", "Adrenaline final assertion requires a schema-adrenaline artifact");
	const consumer = resolveHandbookConsumer(manifest);
	const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
	assert.equal(packageJson.dependencies[artifact.provider], artifact.releaseUrl, "Handbook package pin differs from final artifact");
	const lock = readFileSync("pnpm-lock.yaml", "utf8");
	const resolution = lock.split("\n").find((line) => line.includes("resolution: {") && line.includes(artifact.releaseUrl));
	assert.ok(resolution?.includes(`integrity: ${artifact.integrity}`), "Handbook lock pin differs from final artifact");
	assert.equal(JSON.parse(readFileSync(`node_modules/${artifact.provider}/package.json`, "utf8")).version, artifact.version, "installed version differs from final artifact");
	assert.deepEqual(await archiveHashes(artifact.releaseUrl), { sha256: artifact.sha256, integrity: artifact.integrity }, "final archive bytes differ from artifact");
	run("pnpm", ["build"]);
	for (const script of ["tools/assert-adrenaline-documents.mjs", "tools/assert-adrenaline-contract.mjs", "tools/assert-contextual-pack-blocks.mjs", "tools/assert-source-installer.mjs", "tools/assert-plugin-bundle.mjs"]) run(process.execPath, [script]);
	const evidence = {
		protocol: 2, status: "passed",
		artifact: { releaseUrl: artifact.releaseUrl, sha256: artifact.sha256, integrity: artifact.integrity, version: artifact.version },
		consumer: { role: consumer.role, repository: consumer.repository, ref: consumer.ref },
		lock: { file: "pnpm-lock.yaml", releaseUrl: artifact.releaseUrl, integrity: artifact.integrity },
		journey: { id: "schema-adrenaline-final-adoption", status: "passed", checks: ["documents", "contract", "capability-gating", "source-installer", "production-build", "plugin-bundle"] },
	};
	writeEvidence(manifest.evidencePath, evidence);
	return { evidencePath: manifest.evidencePath, evidence };
}
