import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve, sep } from "node:path";
import type { MistEngineDocumentTarget } from "schema-in-the-mist";

export type MistCanonicalExpectation = "accept" | "reject";
export type MistHandbookExpectation = "render" | "degraded" | "null";

export interface MistContractCase {
	id: string;
	target: MistEngineDocumentTarget;
	file: string;
	canonical: MistCanonicalExpectation;
	handbook: MistHandbookExpectation;
	source: string;
}

export const MIST_TARGET_TO_BLOCK = {
	"city-of-mist/custom-move": null,
	"city-of-mist/danger": "com-danger",
	"city-of-mist/theme-card": "com-theme-card",
	"city-of-mist/theme-kit": null,
	"legend-in-the-mist/challenge": "litm-challenge",
	"legend-in-the-mist/journey": "litm-journey",
	"legend-in-the-mist/story-theme": "theme-card",
	"legend-in-the-mist/theme-kit": "litm-theme-kit",
	"otherscape/challenge": "os-challenge",
	"otherscape/character-trope": "os-character-trope",
	"otherscape/loadout-item": "os-loadout-item",
	"otherscape/power-set": "os-power-set",
	"otherscape/theme": "os-theme",
	"otherscape/theme-kit": "os-theme-kit",
} as const satisfies Record<MistEngineDocumentTarget, string | null>;

export const MIST_TARGETS = Object.keys(
	MIST_TARGET_TO_BLOCK,
) as MistEngineDocumentTarget[];

export const MIST_BLOCK_IDS = Object.values(MIST_TARGET_TO_BLOCK).filter(
	(id): id is Exclude<typeof id, null> => id !== null,
);

interface RawManifestCase {
	id?: unknown;
	target?: unknown;
	file?: unknown;
	canonical?: unknown;
	handbook?: unknown;
}

interface RawManifest {
	version?: unknown;
	cases?: unknown;
}

function isCanonicalExpectation(
	value: unknown,
): value is MistCanonicalExpectation {
	return value === "accept" || value === "reject";
}

function isHandbookExpectation(
	value: unknown,
): value is MistHandbookExpectation {
	return value === "render" || value === "degraded" || value === "null";
}

function isMistTarget(value: unknown): value is MistEngineDocumentTarget {
	return (
		typeof value === "string" &&
		Object.prototype.hasOwnProperty.call(MIST_TARGET_TO_BLOCK, value)
	);
}

function packageRoot(): string {
	const requireFromProject = createRequire(resolve(process.cwd(), "package.json"));
	return dirname(requireFromProject.resolve("schema-in-the-mist/package.json"));
}

export function loadMistContractCases(): MistContractCase[] {
	const corpusRoot = resolve(packageRoot(), "corpus", "contract");
	const manifestPath = resolve(corpusRoot, "cases.json");
	const manifest = JSON.parse(
		readFileSync(manifestPath, "utf8"),
	) as RawManifest;

	if (manifest.version !== 1 || !Array.isArray(manifest.cases)) {
		throw new Error("Mist contract corpus must use manifest version 1");
	}

	const ids = new Set<string>();
	const targets = new Set<MistEngineDocumentTarget>();
	const cases = manifest.cases.map((raw, index): MistContractCase => {
		const entry = raw as RawManifestCase;
		if (
			typeof entry.id !== "string" ||
			typeof entry.file !== "string" ||
			!isMistTarget(entry.target) ||
			!isCanonicalExpectation(entry.canonical) ||
			!isHandbookExpectation(entry.handbook)
		) {
			throw new Error(`Mist contract case ${index} has an invalid shape`);
		}
		if (ids.has(entry.id)) {
			throw new Error(`Mist contract case id is duplicated: ${entry.id}`);
		}

		const filePath = resolve(corpusRoot, entry.file);
		if (!filePath.startsWith(`${corpusRoot}${sep}`)) {
			throw new Error(`${entry.id}: corpus file escapes the package root`);
		}

		ids.add(entry.id);
		targets.add(entry.target);
		return {
			id: entry.id,
			target: entry.target,
			file: entry.file,
			canonical: entry.canonical,
			handbook: entry.handbook,
			source: readFileSync(filePath, "utf8"),
		};
	});

	if (
		targets.size !== MIST_TARGETS.length ||
		MIST_TARGETS.some((target) => !targets.has(target))
	) {
		throw new Error("Mist contract corpus must cover exactly the 14 public targets");
	}

	return cases;
}

export function mistCaseById(
	cases: readonly MistContractCase[],
	id: string,
): MistContractCase {
	const entry = cases.find((candidate) => candidate.id === id);
	if (!entry) {
		throw new Error(`Mist contract case not found: ${id}`);
	}
	return entry;
}
