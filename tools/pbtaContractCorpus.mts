import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve, sep } from "node:path";
import { PBTA_TOML_VERSION } from "schema-pbta";

export const PBTA_TARGET_TO_BLOCK = {
	move: "pbta-move",
	playbook: "pbta-playbook",
} as const;

export type PbtaRenderTarget = keyof typeof PBTA_TARGET_TO_BLOCK;

export interface PbtaContractCase {
	path: string;
	target: string;
	expect: "accept" | "reject";
	source: string;
}

export function loadPbtaContractCases(): PbtaContractCase[] {
	const requireFromProject = createRequire(resolve(process.cwd(), "package.json"));
	const manifestPath = requireFromProject.resolve("schema-pbta/corpus/cases.json");
	const root = dirname(manifestPath);
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
		tomlVersion?: unknown;
		cases?: unknown;
	};
	if (manifest.tomlVersion !== PBTA_TOML_VERSION || !Array.isArray(manifest.cases)) {
		throw new Error("schema-pbta contract manifest is invalid");
	}
	const paths = new Set<string>();
	return manifest.cases.map((raw, index) => {
		const entry = raw as Partial<Omit<PbtaContractCase, "source">>;
		if (typeof entry.path !== "string" || typeof entry.target !== "string" ||
			(entry.expect !== "accept" && entry.expect !== "reject") || paths.has(entry.path)) {
			throw new Error(`invalid PbtA contract case ${index}`);
		}
		const sourcePath = resolve(root, entry.path);
		if (!sourcePath.startsWith(`${root}${sep}`)) throw new Error(`${entry.path}: escapes package root`);
		paths.add(entry.path);
		return { path: entry.path, target: entry.target, expect: entry.expect, source: readFileSync(sourcePath, "utf8") };
	});
}

export function loadPbtaRenderCases(): Array<PbtaContractCase & { target: PbtaRenderTarget }> {
	return loadPbtaContractCases().filter(
		(entry): entry is PbtaContractCase & { target: PbtaRenderTarget } =>
			entry.expect === "accept" && Object.hasOwn(PBTA_TARGET_TO_BLOCK, entry.target),
	);
}
