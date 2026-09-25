import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { proveSchemaPbtaCandidate } from "./prove-schema-pbta-candidate.mjs";
import { readProtocolManifest, resolveHandbookConsumer } from "./release-train-protocol.mjs";

async function sha256(url) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`candidate release download failed: ${response.status}`);
	return createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex");
}

function writeEvidence(path, evidence) {
	const temporary = `${path}.${process.pid}.tmp`;
	writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`);
	renameSync(temporary, path);
}

function run(command, args) {
	const result = spawnSync(command, args, { encoding: "utf8", timeout: 300000, env: process.env });
	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(" ")} failed: ${result.error?.message || result.stderr || result.stdout}`);
	}
}

export function runRealHostProof() {
	if (!process.env.HANDBOOK_E2E_OBSIDIAN) {
		throw new Error("PbtA candidate host proof requires HANDBOOK_E2E_OBSIDIAN pointing to pinned Obsidian 1.13.7; provision the host and xvfb-run before invoking release-train:assert");
	}
	run("pnpm", ["build"]);
	run(process.execPath, ["tools/assert-plugin-bundle.mjs"]);
	run("bash", ["tools/e2e/plugin-load-journey.sh"]);
	return { obsidianVersion: "1.13.7", sha256: createHash("sha256").update(readFileSync("dist/main.js")).digest("hex") };
}

export function buildCandidateEvidence(manifest, consumer, proof, host) {
	if (host.obsidianVersion !== "1.13.7" || !/^[a-f0-9]{64}$/.test(host.sha256)) throw new Error("host proof must identify pinned Obsidian 1.13.7 and the production bundle SHA-256");
	return {
		protocol: 1,
		status: "passed",
		candidate: manifest.candidate,
		consumer: { role: consumer.role, repository: consumer.repository, ref: consumer.ref, resolved: { version: manifest.candidate.version, releaseUrl: manifest.candidate.releaseUrl, integrity: manifest.candidate.integrity } },
		lock: { file: "pnpm-lock.yaml", releaseUrl: manifest.candidate.releaseUrl, integrity: manifest.candidate.integrity },
		journey: { id: "schema-pbta-candidate-adoption", status: "passed", checks: [...proof.proofs, "production-build", "commonjs-plugin-build", "obsidian-load", "obsidian-1.13.7-plugin-load", `artifact-sha256:${host.sha256}`, `obsidian-version:${host.obsidianVersion}`] },
	};
}

export async function assertReleaseTrain(manifestPath, hostProof = runRealHostProof) {
	const defaultEvidencePath = `${manifestPath}.evidence.json`;
	if (existsSync(defaultEvidencePath)) rmSync(defaultEvidencePath);
	const manifest = readProtocolManifest(manifestPath);
	const consumer = resolveHandbookConsumer(manifest);
	if (await sha256(manifest.candidate.releaseUrl) !== manifest.candidate.sha256) throw new Error("candidate SHA-256 disagrees with release asset");
	const proof = proveSchemaPbtaCandidate({ releaseUrl: manifest.candidate.releaseUrl, integrity: manifest.candidate.integrity, finalTag: manifest.candidate.finalTag });
	const host = hostProof();
	const evidence = buildCandidateEvidence(manifest, consumer, proof, host);
	writeEvidence(defaultEvidencePath, evidence);
	return { proof, evidencePath: defaultEvidencePath, evidence };
}
