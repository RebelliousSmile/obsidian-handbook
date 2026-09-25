/* global console, process */
import { existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { proveHandbookHostArtifact } from "./prove-handbook-host-artifact.mjs";
import { assertReleaseTrain } from "./release-train-schema-pbta-assert.mjs";
import { assertSchemaAdrenalineReleaseTrain } from "./release-train-schema-adrenaline-assert.mjs";
import { readProtocolManifest, resolveManifestPath } from "./release-train-protocol.mjs";

const PROVIDER_ASSERTIONS = {
	"schema-pbta": assertReleaseTrain,
	"schema-adrenaline": assertSchemaAdrenalineReleaseTrain,
};

function writeEvidence(path, evidence) {
	const temporary = `${path}.${process.pid}.tmp`;
	try {
		writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`);
		renameSync(temporary, path);
	} finally {
		if (existsSync(temporary)) rmSync(temporary);
	}
}

export async function runReleaseTrain(manifestArgument, dependencies = {}) {
	const manifestPath = resolveManifestPath(manifestArgument);
	const evidencePath = `${manifestPath}.evidence.json`;
	if (existsSync(evidencePath)) rmSync(evidencePath);
	try {
		const manifest = readProtocolManifest(manifestPath);
		const assertions = dependencies.providerAssertions ?? PROVIDER_ASSERTIONS;
		const assertion = assertions[manifest.candidate.provider];
		if (!assertion) throw new Error("release-train candidate provider is not supported");
		const provider = await assertion(manifestPath);
		const proveHost = dependencies.proveHost ?? proveHandbookHostArtifact;
		const host = await proveHost();
		const evidence = {
			...provider.evidence,
			journey: {
				...provider.evidence.journey,
				checks: [...provider.evidence.journey.checks, ...host.checks],
			},
			hostArtifact: {
				status: host.status,
				obsidianVersion: host.obsidianVersion,
				plugin: host.plugin,
				assets: host.assets,
			},
		};
		writeEvidence(evidencePath, evidence);
		return { proof: provider.proof, host, evidencePath, evidence };
	} catch (error) {
		if (existsSync(evidencePath)) rmSync(evidencePath);
		throw error;
	}
}

async function main() {
	const arguments_ = process.argv.slice(2).filter((value) => value !== "--");
	if (arguments_.length !== 1) throw new Error("release-train assertion requires exactly one manifest path");
	const result = await runReleaseTrain(arguments_[0]);
	console.log(JSON.stringify({ status: "passed", evidencePath: result.evidencePath }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
