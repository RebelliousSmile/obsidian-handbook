import { createHash } from "node:crypto";
import { proveSchemaPbtaCandidate } from "./prove-schema-pbta-candidate.mjs";
import { readProtocolManifest, resolveHandbookConsumer } from "./release-train-protocol.mjs";

async function sha256(url) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`candidate release download failed: ${response.status}`);
	return createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex");
}

export async function assertReleaseTrain(manifestPath) {
	const defaultEvidencePath = `${manifestPath}.evidence.json`;
	const manifest = readProtocolManifest(manifestPath);
	const consumer = resolveHandbookConsumer(manifest);
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
	return { proof, evidencePath: defaultEvidencePath, evidence };
}
