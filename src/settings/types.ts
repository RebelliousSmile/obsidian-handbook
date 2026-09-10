import { CalloutDefinition } from "../features/callouts/types";
import { NATIVE_CALLOUTS } from "../features/callouts/nativeCallouts";
import { normalizeCallouts } from "../features/callouts/migrateAliases";
import {
	sanitizeAlias,
	sanitizeAliases,
} from "../features/callouts/sanitizeAlias";
import {
	DEFAULT_GAME_PACK_ID,
	GAME_REGISTRATIONS,
	findGamePack,
	normalizeGameVariantId,
} from "../games/registry";
import { logScope } from "../utils/logger";

export { sanitizeAlias, sanitizeAliases };

/**
 * The identifier of a game pack, and the value written in the user's
 * `data.json`. It was a closed union of three; it is now open, so that adding
 * a game is adding a pack and nothing else. `normalizeMode` stays the only
 * door in: it is what guarantees a saved value still resolves.
 */
export type BrumesMode = string;

const modeLog = logScope("Games");

export type LogLevel = "none" | "error" | "warn" | "info" | "debug";
export type ColourScheme = "obsidian" | "light" | "dark";

export interface BrumesFeatureSettings {
	tagsSyntax: boolean;
	workspaceTheme: boolean;
	lanternIntegration: boolean;
	storyThemeParser: boolean;
	challengeParser: boolean;
	journeyParser: boolean;
	themeKitParser: boolean;
	comThemeCardParser: boolean;
	comDangerParser: boolean;
	osThemeParser: boolean;
	osThemeKitParser: boolean;
	osChallengeParser: boolean;
	osPowerSetParser: boolean;
	osCharacterTropeParser: boolean;
	osLoadoutItemParser: boolean;
	adrenalinePjParser: boolean;
	adrenalinePnjParser: boolean;
	adrenalineMonsterParser: boolean;
}

export interface CityOfMistCalloutAliases {
	note: string[];
	move: string[];
	description: string[];
	clue: string[];
	redClue: string[];
}

export interface LegendInTheMistCalloutAliases {
	note: string[];
	readAloud: string[];
}

export interface BrumesCalloutAliasesSettings {
	cityOfMist: CityOfMistCalloutAliases;
	legendInTheMist: LegendInTheMistCalloutAliases;
}

export interface BrumesSettings {
	mode: BrumesMode;
	gameVariants: Record<string, string>;
	colourScheme: ColourScheme;
	logLevel: LogLevel;
	lanternUrl: string;
	features: BrumesFeatureSettings;
	callouts: CalloutDefinition[];
}

export const DEFAULT_SETTINGS: BrumesSettings = {
	mode: DEFAULT_GAME_PACK_ID,
	gameVariants: { otherscape: "metro" },
	colourScheme: "obsidian",
	logLevel: "error",
	lanternUrl: "https://lantern.ravenloft.fr",
	features: {
		tagsSyntax: true,
		workspaceTheme: true,
		lanternIntegration: true,
		storyThemeParser: true,
		challengeParser: true,
		journeyParser: true,
		themeKitParser: true,
		comThemeCardParser: true,
		comDangerParser: true,
		osThemeParser: true,
		osThemeKitParser: true,
		osChallengeParser: true,
		osPowerSetParser: true,
		osCharacterTropeParser: true,
		osLoadoutItemParser: true,
		adrenalinePjParser: true,
		adrenalinePnjParser: true,
		adrenalineMonsterParser: true,
	},
	callouts: NATIVE_CALLOUTS,
};

const LOG_LEVELS: LogLevel[] = ["none", "error", "warn", "info", "debug"];
const COLOUR_SCHEMES: ColourScheme[] = ["obsidian", "light", "dark"];

export function normalizeMode(mode: unknown): BrumesMode {
	// The colon was dropped from the identifier, not from the name.
	const id = mode === ":otherscape" ? "otherscape" : mode;

	if (findGamePack(id)) {
		return id as BrumesMode;
	}

	if (typeof mode === "string" && mode.length > 0) {
		modeLog.warn(
			`No game pack answers to "${mode}", falling back on "${DEFAULT_GAME_PACK_ID}". Reinstall optional packs in Handbook's persistent packs directory if this followed an update.`,
		);
	}

	return DEFAULT_SETTINGS.mode;
}

function normalizeLogLevel(level: unknown): LogLevel {
	if (typeof level === "string" && LOG_LEVELS.includes(level as LogLevel)) {
		return level as LogLevel;
	}

	return DEFAULT_SETTINGS.logLevel;
}

function normalizeColourScheme(value: unknown): ColourScheme {
	if (
		typeof value === "string" &&
		COLOUR_SCHEMES.includes(value as ColourScheme)
	) {
		return value as ColourScheme;
	}

	return DEFAULT_SETTINGS.colourScheme;
}

function normalizeGameVariants(value: unknown): Record<string, string> {
	const source =
		typeof value === "object" && value !== null
			? (value as Record<string, unknown>)
			: {};
	const normalized: Record<string, string> = {};

	for (const registration of GAME_REGISTRATIONS) {
		const id = normalizeGameVariantId(
			registration.pack.id,
			source[registration.pack.id],
		);
		if (id) {
			normalized[registration.pack.id] = id;
		}
	}

	return normalized;
}

/**
 * Keep every declared feature flag, defaulting the ones the saved data misses.
 * Adding a flag to `BrumesFeatureSettings` and `DEFAULT_SETTINGS` is enough.
 */
function normalizeFeatures(
	features: Partial<BrumesFeatureSettings>,
): BrumesFeatureSettings {
	const normalized = { ...DEFAULT_SETTINGS.features };
	const keys = Object.keys(normalized) as (keyof BrumesFeatureSettings)[];

	for (const key of keys) {
		const value = features[key];

		if (typeof value === "boolean") {
			normalized[key] = value;
		}
	}

	return normalized;
}

/**
 * The stored data may still be the pre-migration shape (`calloutAliases`,
 * no `callouts`): kept here only so `normalizeCallouts` can read it once,
 * not as a `BrumesSettings` field any more.
 */
type LegacyCalloutAliasesData = {
	calloutAliases?: Partial<BrumesCalloutAliasesSettings>;
};

export function normalizeSettings(
	data: (Partial<BrumesSettings> & LegacyCalloutAliasesData) | null | undefined,
): BrumesSettings {
	const source = data ?? {};
	const features: Partial<BrumesFeatureSettings> = source.features ?? {};

	return {
		mode: normalizeMode(source.mode),
		gameVariants: normalizeGameVariants(source.gameVariants),
		colourScheme: normalizeColourScheme(source.colourScheme),
		logLevel: normalizeLogLevel(source.logLevel),
		lanternUrl:
			typeof source.lanternUrl === "string"
				? source.lanternUrl.trim() || DEFAULT_SETTINGS.lanternUrl
				: DEFAULT_SETTINGS.lanternUrl,
		features: normalizeFeatures(features),
		callouts: normalizeCallouts(source.callouts, source.calloutAliases),
	};
}
