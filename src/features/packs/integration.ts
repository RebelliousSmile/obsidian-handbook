import type { Plugin } from "obsidian";
import {
	GAME_PLUGIN_BLOCK_CAPABILITIES,
	GAME_PLUGIN_STYLE_CAPABILITIES,
	gamePluginCapabilityIssues,
} from "../../games/capabilities";
import {
	GameAssetState,
	emptyAssetState,
	resolveGameAssets,
} from "../../games/assets";
import { GAME_REGISTRATIONS } from "../../games/registry";
import type { GameRegistration } from "../../games/variants";

export type PackIntegrationFindingKind =
	| "missing-manifest"
	| "unsupported-capability"
	| "unavailable-block"
	| "unavailable-style"
	| "missing-resource";

export interface PackIntegrationFinding {
	kind: PackIntegrationFindingKind;
	detail: string;
}

export interface PackIntegrationInput {
	registration: GameRegistration;
	assets: GameAssetState;
}

export interface PackIntegrationRow {
	id: string;
	label: string;
	installed: boolean;
	declaredCapabilities: string[];
	availableBlocks: string[];
	availableStyles: string[];
	missingResources: string[];
	findings: PackIntegrationFinding[];
	ready: boolean;
}

export interface PackIntegrationReport {
	packs: PackIntegrationRow[];
	installed: number;
	ready: number;
	attention: number;
}

function resourceFindings(assets: GameAssetState): PackIntegrationFinding[] {
	const paths = [
		...assets.missing.map((entry) => entry.path),
		...assets.missingFonts.map((entry) => entry.path),
		...assets.missingResources,
		...assets.missingStylesheets.map((entry) => entry.path),
	];
	return [...new Set(paths)].map((detail) => ({ kind: "missing-resource", detail }));
}

/**
 * Convert resolved pack state into stable, user-facing readiness facts. This
 * stays independent of the vault so the focused harness can prove every gap.
 */
export function packIntegrationReport(inputs: PackIntegrationInput[]): PackIntegrationReport {
	const packs = inputs.map(({ registration, assets }) => {
		const requires = registration.installation?.requires ?? [];
		const issues = gamePluginCapabilityIssues(registration.pack.id, requires);
		const blockCapabilities = requires.filter((capability) => capability.startsWith("block:"));
		const styleCapabilities = requires.filter((capability) => capability.startsWith("style:"));
		const availableBlocks = blockCapabilities.filter(
			(capability) => GAME_PLUGIN_BLOCK_CAPABILITIES.includes(capability),
		);
		const availableStyles = styleCapabilities.filter((capability) =>
			GAME_PLUGIN_STYLE_CAPABILITIES.includes(capability),
		);
		const findings: PackIntegrationFinding[] = [];

		if (!registration.installation) {
			findings.push({ kind: "missing-manifest", detail: "No installed plugin manifest." });
		}
		for (const capability of [...issues.unknown, ...issues.foreign]) {
			findings.push({ kind: "unsupported-capability", detail: capability });
		}
		for (const capability of blockCapabilities) {
			if (!availableBlocks.includes(capability)) {
				findings.push({ kind: "unavailable-block", detail: capability });
			}
		}
		for (const capability of styleCapabilities) {
			if (!availableStyles.includes(capability)) {
				findings.push({ kind: "unavailable-style", detail: capability });
			}
		}
		findings.push(...resourceFindings(assets));

		return {
			id: registration.pack.id,
			label: registration.pack.label,
			installed: Boolean(registration.installation),
			declaredCapabilities: [...requires],
			availableBlocks,
			availableStyles,
			missingResources: resourceFindings(assets).map((finding) => finding.detail),
			findings,
			ready: findings.length === 0,
		};
	});

	return {
		packs,
		installed: packs.filter((pack) => pack.installed).length,
		ready: packs.filter((pack) => pack.ready).length,
		attention: packs.filter((pack) => !pack.ready).length,
	};
}

/** Resolve every registered pack on demand; the active pack cache is not valid here. */
export async function currentPackIntegration(plugin: Plugin): Promise<PackIntegrationReport> {
	const inputs = await Promise.all(
		GAME_REGISTRATIONS.map(async (registration) => ({
			registration,
			assets: await resolveGameAssets(plugin, registration.pack, registration.installation),
		})),
	);
	return packIntegrationReport(inputs);
}

/** A small fixture helper for callers that need no declared resources. */
export function emptyPackIntegrationAssets(packId: string): GameAssetState {
	return emptyAssetState(packId);
}
