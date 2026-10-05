import type { BrumesCalloutAliasesSettings } from "../../settings/types";
import { ADRENALINE_VISUAL_CALLOUTS } from "schema-adrenaline/presentation";
import { PBTA_VISUAL_CALLOUTS } from "schema-pbta";
import { logScope } from "../../utils/logger";
import { NATIVE_CALLOUTS } from "./nativeCallouts";
import { sanitizeAliases } from "./sanitizeAlias";
import {
	CalloutDefinition,
	isCalloutColorRegime,
	isCalloutFontRole,
	isCalloutScope,
	isCalloutTemplate,
} from "./types";

const calloutsLog = logScope("Callouts");

/**
 * Old shape id -> saved alias list, one entry per native callout. Kept
 * explicit rather than derived, since the old and new ids never shared a
 * naming pattern.
 */
const OLD_ALIASES_BY_NATIVE_ID: Record<
	string,
	(old: Partial<BrumesCalloutAliasesSettings>) => string[] | undefined
> = {
	"city-of-mist-clue": (old) => old.cityOfMist?.clue,
	"city-of-mist-red-clue": (old) => old.cityOfMist?.redClue,
	"city-of-mist-move": (old) => old.cityOfMist?.move,
	"city-of-mist-description": (old) => old.cityOfMist?.description,
	"city-of-mist-note": (old) => old.cityOfMist?.note,
	"legend-in-the-mist-note": (old) => old.legendInTheMist?.note,
	"legend-in-the-mist-read-aloud": (old) => old.legendInTheMist?.readAloud,
};

export function migrateAliases(
	old: Partial<BrumesCalloutAliasesSettings> | undefined,
): CalloutDefinition[] {
	const source = old ?? {};

	return NATIVE_CALLOUTS.map((native) => {
		const savedAliases = OLD_ALIASES_BY_NATIVE_ID[native.id]?.(source);

		if (!savedAliases || savedAliases.length === 0) {
			return { ...native, aliases: [...native.aliases] };
		}

		return { ...native, aliases: sanitizeAliases(savedAliases) };
	});
}

/**
 * Entry point `normalizeSettings` calls: a `callouts` array already in the
 * new shape is validated field by field, a missing one falls back to
 * migrating the old `calloutAliases` shape.
 */
export function normalizeCallouts(
	callouts: unknown,
	calloutAliases: Partial<BrumesCalloutAliasesSettings> | undefined,
): CalloutDefinition[] {
	if (!Array.isArray(callouts)) {
		return migrateAliases(calloutAliases);
	}

	const takenIds = new Set<string>();
	const normalized: CalloutDefinition[] = [];

	for (const raw of callouts) {
		const entry = normalizeCalloutEntry(raw, takenIds);
		if (entry) {
			takenIds.add(entry.id);
			takenIds.add(entry.styleKey);
			normalized.push(entry);
		}
	}

	// Callouts a schema added after the user's settings were saved. A default
	// alias the user already claimed is dropped; if none is left, the first one
	// gets a numeric suffix so the callout stays reachable. Only a callout
	// visible from the same game can claim an alias: `description` belongs to
	// City of Mist and to Adrenaline alike, each in its own scope.
	const schemaCalloutIds: string[] = [];
	for (const definition of PBTA_VISUAL_CALLOUTS) schemaCalloutIds.push(definition.id);
	for (const definition of ADRENALINE_VISUAL_CALLOUTS) schemaCalloutIds.push(definition.id);
	for (const id of schemaCalloutIds) {
		if (normalized.some((entry) => entry.id === id)) continue;
		const native = NATIVE_CALLOUTS.find((entry) => entry.id === id);
		if (!native) continue;
		const isClaimed = (alias: string): boolean =>
			normalized.some(
				(entry) =>
					(entry.scope === "all" || native.scope === "all" || entry.scope === native.scope) &&
					entry.aliases.indexOf(alias) !== -1,
			);
		const aliases = native.aliases.filter((alias) => !isClaimed(alias));
		if (aliases.length === 0) {
			const base = native.aliases[0];
			let alias = base;
			let suffix = 2;
			while (isClaimed(alias)) {
				alias = `${base}-${suffix}`;
				suffix += 1;
			}
			aliases.push(alias);
		}
		normalized.push({ ...native, aliases });
	}

	return normalized;
}

function normalizeCalloutEntry(
	raw: unknown,
	takenIds: Set<string>,
): CalloutDefinition | null {
	if (typeof raw !== "object" || raw === null) {
		calloutsLog.warn("Discarding a callout entry that is not an object.");
		return null;
	}

	const candidate = raw as Partial<CalloutDefinition>;

	if (candidate.native) {
		const native = NATIVE_CALLOUTS.find((entry) => entry.id === candidate.id);
		if (!native) {
			calloutsLog.warn(
				`Discarding a native callout entry with unknown id "${String(candidate.id)}".`,
			);
			return null;
		}

		const aliases = Array.isArray(candidate.aliases)
			? sanitizeAliases(candidate.aliases.map(String))
			: [...native.aliases];

		return { ...native, aliases };
	}

	const declaredName = String(candidate.name);
	if (typeof candidate.name !== "string" || candidate.name.trim().length === 0) {
		calloutsLog.warn(`Discarding a callout entry without a name (got "${declaredName}").`);
		return null;
	}

	const name = candidate.name.trim();

	if (!isCalloutScope(candidate.scope)) {
		calloutsLog.warn(`Discarding callout "${name}": unknown scope.`);
		return null;
	}

	if (!isCalloutTemplate(candidate.template)) {
		calloutsLog.warn(`Discarding callout "${name}": unknown template.`);
		return null;
	}

	if (!isCalloutFontRole(candidate.font)) {
		calloutsLog.warn(`Discarding callout "${name}": unknown font role.`);
		return null;
	}

	if (!isCalloutColorRegime(candidate.color)) {
		calloutsLog.warn(`Discarding callout "${name}": malformed color regime.`);
		return null;
	}

	const aliases = Array.isArray(candidate.aliases)
		? sanitizeAliases(candidate.aliases.map(String))
		: [];

	const id =
		typeof candidate.id === "string" && candidate.id.trim().length > 0
			? candidate.id
			: generateCalloutId(name, takenIds);

	return {
		id,
		name,
		aliases,
		scope: candidate.scope,
		template: candidate.template,
		icon: typeof candidate.icon === "string" ? candidate.icon : undefined,
		font: candidate.font,
		color: candidate.color,
		native: false,
		styleKey: id,
	};
}

const NATIVE_TAKEN_IDS = new Set<string>();
for (const entry of NATIVE_CALLOUTS) {
	NATIVE_TAKEN_IDS.add(entry.id);
	NATIVE_TAKEN_IDS.add(entry.styleKey);
}

export function generateCalloutId(name: string, takenIds: Set<string>): string {
	const base =
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "callout";

	let candidate = base;
	let suffix = 2;

	while (takenIds.has(candidate) || NATIVE_TAKEN_IDS.has(candidate)) {
		candidate = `${base}-${suffix}`;
		suffix += 1;
	}

	return candidate;
}
