import { createHash } from "node:crypto";
import { existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
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

export async function assertReleaseTrain(manifestPath) {
	const defaultEvidencePath = `${manifestPath}.evidence.json`;
	if (existsSync(defaultEvidencePath)) rmSync(defaultEvidencePath);
	const manifest = readProtocolManifest(manifestPath);
	const consumer = resolveHandbookConsumer(manifest);
	if (manifest.evidencePath !== defaultEvidencePath) throw new Error("evidencePath must be adjacent to the manifest");
	if (await sha256(manifest.candidate.releaseUrl) !== manifest.candidate.sha256) throw new Error("candidate SHA-256 disagrees with release asset");
	const proof = proveSchemaPbtaCandidate({ releaseUrl: manifest.candidate.releaseUrl, integrity: manifest.candidate.integrity, finalTag: manifest.candidate.finalTag });
	const evidence = {
		protocol: 1,
		status: "passed",
		candidate: manifest.candidate,
		consumer: { role: consumer.role, repository: consumer.repository, ref: consumer.ref, resolved: { version: manifest.candidate.version, releaseUrl: manifest.candidate.releaseUrl, integrity: manifest.candidate.integrity } },
		lock: { file: "pnpm-lock.yaml", releaseUrl: manifest.candidate.releaseUrl, integrity: manifest.candidate.integrity },
		journey: { id: "schema-pbta-candidate-adoption", status: "passed", checks: proof.proofs },
	};
	writeEvidence(defaultEvidencePath, evidence);
	return { proof, evidencePath: defaultEvidencePath, evidence };
}
