import { readGamePack } from "./fromSchema";
import { missingGamePluginCapabilities } from "./capabilities";
import { GamePack } from "./types";

export const GAME_PLUGIN_MANIFEST_VERSION = 1;

const MANIFEST_FIELDS = [
	"manifestVersion",
	"version",
	"minimumHandbookVersion",
	"requires",
	"pack",
];
const CAPABILITY_PATTERN = /^(?:block|style):[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_PATTERN =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export interface GamePluginManifest {
	manifestVersion: number;
	version: string;
	minimumHandbookVersion: string;
	requires: string[];
	pack: GamePack;
}

export interface GamePluginInstallation {
	root: string;
	version: string;
	minimumHandbookVersion: string;
	requires: string[];
}

export interface InstalledGamePlugin {
	pack: GamePack;
	installation?: GamePluginInstallation;
}

export type GamePluginManifestResult =
	| { manifest: GamePluginManifest; error?: never }
	| { manifest?: never; error: string };

interface SemVer {
	major: number;
	minor: number;
	patch: number;
	prerelease: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSemVer(value: unknown): SemVer | null {
	if (typeof value !== "string") {
		return null;
	}

	const match = SEMVER_PATTERN.exec(value);
	if (!match) {
		return null;
	}
	const numbers = [Number(match[1]), Number(match[2]), Number(match[3])];
	if (numbers.some((part) => !Number.isSafeInteger(part))) {
		return null;
	}
	const prerelease = match[4]?.split(".") ?? [];
	if (
		prerelease.some(
			(part) => /^\d+$/.test(part) && part.length > 1 && part.startsWith("0"),
		)
	) {
		return null;
	}

	return {
		major: numbers[0],
		minor: numbers[1],
		patch: numbers[2],
		prerelease,
	};
}

function comparePrerelease(left: string[], right: string[]): number {
	if (left.length === 0 || right.length === 0) {
		return left.length === right.length ? 0 : left.length === 0 ? 1 : -1;
	}

	const length = Math.max(left.length, right.length);
	for (let index = 0; index < length; index++) {
		const a = left[index];
		const b = right[index];
		if (a === undefined || b === undefined) {
			return a === b ? 0 : a === undefined ? -1 : 1;
		}
		if (a === b) {
			continue;
		}

		const aNumeric = /^\d+$/.test(a);
		const bNumeric = /^\d+$/.test(b);
		if (aNumeric && bNumeric) {
			return Number(a) < Number(b) ? -1 : 1;
		}
		if (aNumeric !== bNumeric) {
			return aNumeric ? -1 : 1;
		}
		return a < b ? -1 : 1;
	}

	return 0;
}

function compareSemVer(left: SemVer, right: SemVer): number {
	for (const field of ["major", "minor", "patch"] as const) {
		if (left[field] !== right[field]) {
			return left[field] < right[field] ? -1 : 1;
		}
	}

	return comparePrerelease(left.prerelease, right.prerelease);
}

function readRequirements(value: unknown): string[] | null {
	if (!Array.isArray(value)) {
		return null;
	}

	const requirements: string[] = [];
	for (const entry of value) {
		if (
			typeof entry !== "string" ||
			!CAPABILITY_PATTERN.test(entry) ||
			requirements.includes(entry)
		) {
			return null;
		}
		requirements.push(entry);
	}

	return requirements;
}

/**
 * Read the strict installation envelope around the deliberately tolerant
 * GamePack document. An incompatible plugin is rejected whole before it can
 * enter the registry.
 */
export function readGamePluginManifest(
	source: unknown,
	handbookVersion: string,
): GamePluginManifestResult {
	if (!isRecord(source)) {
		return { error: "the manifest is not an object" };
	}

	const unknown = Object.keys(source).filter(
		(name) => !MANIFEST_FIELDS.includes(name),
	);
	if (unknown.length > 0) {
		return { error: `unknown manifest fields: ${unknown.join(", ")}` };
	}

	if (source.manifestVersion !== GAME_PLUGIN_MANIFEST_VERSION) {
		return {
			error: `manifest version ${String(source.manifestVersion)} is not supported`,
		};
	}

	const version = parseSemVer(source.version);
	if (!version) {
		return { error: `"version" is not valid SemVer` };
	}

	const minimum = parseSemVer(source.minimumHandbookVersion);
	if (!minimum) {
		return { error: `"minimumHandbookVersion" is not valid SemVer` };
	}

	const host = parseSemVer(handbookVersion);
	if (!host) {
		return { error: `Handbook version "${handbookVersion}" is not valid SemVer` };
	}
	if (compareSemVer(host, minimum) < 0) {
		return {
			error: `requires Handbook ${String(source.minimumHandbookVersion)} or newer (installed: ${handbookVersion})`,
		};
	}

	const requires = readRequirements(source.requires);
	if (!requires) {
		return { error: `"requires" is not a valid capability list` };
	}

	const missing = missingGamePluginCapabilities(requires);
	if (missing.length > 0) {
		return { error: `missing Handbook capabilities: ${missing.join(", ")}` };
	}

	const pack = readGamePack(source.pack);
	if (!pack) {
		return { error: `"pack" is not a usable game pack` };
	}

	return {
		manifest: {
			manifestVersion: GAME_PLUGIN_MANIFEST_VERSION,
			version: String(source.version),
			minimumHandbookVersion: String(source.minimumHandbookVersion),
			requires,
			pack,
		},
	};
}
