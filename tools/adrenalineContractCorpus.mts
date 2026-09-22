import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve, sep } from "node:path";
import type { AdrenalineDocumentTarget } from "schema-adrenaline";

export type ContractFormat = "json" | "toml";
export type ContractExpectation = "accept" | "reject";
export interface AdrenalineContractCase {
	path: string;
	target: AdrenalineDocumentTarget;
	format: ContractFormat;
	expect: ContractExpectation;
	source: string;
}

const targets = new Set<AdrenalineDocumentTarget>(["pj", "pnj", "monstre"]);

/**
 * The contract major is the compatibility axis; the producer's patch and minor are its own business.
 * Freezing the full version made every upstream release a red build here, with nothing broken.
 */
export function assertAdrenalineContractVersion(version: unknown): asserts version is string {
	if (typeof version !== "string" || !/^2\.\d+\.\d+$/.test(version)) {
		throw new Error(`schema-adrenaline package must be a 2.x contract, received ${String(version)}`);
	}
}

export function loadAdrenalineContractCases(): AdrenalineContractCase[] {
	const requireFromProject = createRequire(resolve(process.cwd(), "package.json"));
	const manifestPath = requireFromProject.resolve("schema-adrenaline/corpus/cases.json");
	const root = dirname(dirname(manifestPath));
	const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { version?: unknown };
	assertAdrenalineContractVersion(packageJson.version);
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
		manifestVersion?: unknown;
		tomlVersion?: unknown;
		cases?: unknown;
	};
	if (manifest.manifestVersion !== 1 || manifest.tomlVersion !== "1.0.0" || !Array.isArray(manifest.cases)) {
		throw new Error("schema-adrenaline v2 contract manifest is invalid");
	}
	const ids = new Set<string>();
	return manifest.cases.map((raw, index) => {
		const entry = raw as Partial<Omit<AdrenalineContractCase, "source">>;
		if (!entry.path || !targets.has(entry.target as AdrenalineDocumentTarget) ||
			(entry.format !== "json" && entry.format !== "toml") ||
			(entry.expect !== "accept" && entry.expect !== "reject") || ids.has(entry.path)) {
			throw new Error(`invalid Adrenaline contract case ${index}`);
		}
		const sourcePath = resolve(root, entry.path);
		if (!sourcePath.startsWith(`${root}${sep}`)) throw new Error(`${entry.path}: escapes package root`);
		ids.add(entry.path);
		return { ...entry, target: entry.target as AdrenalineDocumentTarget, format: entry.format, expect: entry.expect, source: readFileSync(sourcePath, "utf8") };
	});
}
