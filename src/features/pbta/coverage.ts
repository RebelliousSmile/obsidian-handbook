import { PBTA_DOCUMENT_CODECS } from "schema-pbta";
import { PORTABLE_GAME_PLUGIN_SUPPORT } from "../../games/capabilities";
import { PBTA_PROJECTED_TARGETS } from "./specializedPlaybooks";

/**
 * Targets every PbtA game shares. Anything else a build carries is specialised:
 * it belongs to exactly one game pack, whose id prefixes the target name.
 */
export const PBTA_GENERIC_TARGETS: readonly string[] = [
	"game-definition",
	"move",
	"playbook",
	"npc",
	"front",
];

/**
 * Specialised targets whose schema is the portable playbook under another name. A document cannot
 * name them: an Apocalypse World game is described by the portable playbook, its specifics carried by
 * its game definition, so reading it as a generic playbook is correct and not a gap.
 *
 * Declared here because the plugin ships no corpus and cannot measure it at runtime. The assertion
 * proves this list against the shared corpus, so it cannot outlive the aliases it names. Declared, and
 * not merely measured: a specialised schema too loose to reject the portable playbook is
 * indistinguishable from an alias by measurement, and belongs in neither list until it is fixed.
 */
export const PBTA_ALIAS_TARGETS: readonly string[] = ["salvage-run-playbook"];

/**
 * A pack that opts into any of these speaks the PbtA contract. The list is not restated here:
 * PORTABLE_GAME_PLUGIN_SUPPORT is the one the pack registry already opposes to the manifest of every
 * installed pack, and `assert:pbta-pack-coverage` proves it is included in what the pinned
 * schema-pbta publishes for Handbook.
 */
const PBTA_CAPABILITIES: readonly string[] = [
	...PORTABLE_GAME_PLUGIN_SUPPORT.blocks,
	...PORTABLE_GAME_PLUGIN_SUPPORT.styles,
];

export interface PbtaCoverageInput {
	id: string;
	requires?: readonly string[];
}

export interface PbtaCoverageReport {
	/** Specialised targets this build resolves from a document alone. */
	projected: string[];
	/** Specialised targets that are the portable playbook under another name; reading them generically is right. */
	aliases: string[];
	/**
	 * Specialised targets this build carries, that a document could name, and that Handbook does not
	 * resolve yet. An upstream addition lands here: the documents still render as generic playbooks.
	 */
	unresolved: string[];
	/** Installed packs that declare a PbtA capability. */
	packs: string[];
	/** Projected targets whose owning pack is not installed, so no document can reach them. */
	missingPacks: string[];
	/** Declared generic targets this build no longer carries. */
	unknownGeneric: string[];
}

function codecTargets(): string[] {
	return Object.keys(PBTA_DOCUMENT_CODECS);
}

/**
 * Accounts for every PbtA codec target this build carries against the packs a
 * vault has installed. The report answers one question the user cannot check by
 * eye: which game-specific playbook formats this Handbook can actually read.
 */
export function pbtaCoverageReport(installed: readonly PbtaCoverageInput[]): PbtaCoverageReport {
	const targets = codecTargets();
	const specialised = targets.filter((target) => !PBTA_GENERIC_TARGETS.includes(target));
	const projected = specialised.filter((target) => (PBTA_PROJECTED_TARGETS as readonly string[]).includes(target));
	const packs: string[] = [];
	for (const pack of installed) {
		const requires = pack.requires ?? [];
		if (requires.some((capability) => PBTA_CAPABILITIES.includes(capability))) packs.push(pack.id);
	}
	const unprojected = specialised.filter((target) => !(PBTA_PROJECTED_TARGETS as readonly string[]).includes(target));
	return {
		projected,
		aliases: unprojected.filter((target) => PBTA_ALIAS_TARGETS.includes(target)),
		unresolved: unprojected.filter((target) => !PBTA_ALIAS_TARGETS.includes(target)),
		packs,
		/* Ownership is read off the target name: a specialised target is `<pack.id>-playbook`. The
		   assertion proves that form against every pack contract the pinned tarball publishes, so a
		   broken convention fails the build instead of making this report lie at runtime. */
		missingPacks: projected.filter((target) => !packs.some((id) => target.indexOf(id + "-") === 0)),
		unknownGeneric: PBTA_GENERIC_TARGETS.filter((target) => !targets.includes(target)).slice(),
	};
}

/**
 * One line per finding, in the order a reader needs them. Empty means nothing to report.
 *
 * An alias is not a finding: a game whose playbook is the portable one — an Apocalypse World game,
 * carried by its game definition rather than by its schema — is read correctly as a generic playbook.
 * It is reported separately, as information.
 *
 * A target the schema source added and this build does not resolve yet is a finding, not a failure:
 * the documents still render, generically, and the vault owner is the one who needs to know.
 */
export function describePbtaCoverage(report: PbtaCoverageReport): string[] {
	const lines: string[] = [];
	if (report.unresolved.length > 0) {
		lines.push(
			`Formats this build carries but does not resolve yet: ${report.unresolved.join(", ")}. Their documents read as generic playbooks.`,
		);
	}
	if (report.unknownGeneric.length > 0) {
		lines.push(`Generic targets this build no longer carries: ${report.unknownGeneric.join(", ")}.`);
	}
	if (report.missingPacks.length > 0) {
		lines.push(`Formats without their installed pack: ${report.missingPacks.join(", ")}.`);
	}
	return lines;
}
