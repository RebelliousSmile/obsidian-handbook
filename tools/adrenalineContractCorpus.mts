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

export function assertAdrenalineContractVersion(version: unknown): asserts version is "1.0.0" {
	if (version !== "1.0.0") {
		throw new Error(`schema-adrenaline package version must be 1.0.0, received ${String(version)}`);
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
		throw new Error("schema-adrenaline v1 contract manifest is invalid");
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
