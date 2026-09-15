import { readFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
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

export function loadAdrenalineContractCases(): AdrenalineContractCase[] {
	const root = dirname(dirname(fileURLToPath(import.meta.resolve("schema-adrenaline"))));
	const manifest = JSON.parse(readFileSync(resolve(root, "corpus", "cases.json"), "utf8")) as {
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
