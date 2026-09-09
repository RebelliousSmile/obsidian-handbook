import {
	DEFAULT_GAME_PACK_ID,
	GAME_REGISTRATIONS,
	findGamePack,
	normalizeGameVariantId,
} from "../games/registry";
import { logScope } from "../utils/logger";

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
	calloutAliases: BrumesCalloutAliasesSettings;
}

export const DEFAULT_CITY_OF_MIST_CALLOUT_ALIASES: CityOfMistCalloutAliases = {
	note: ["note", "aside"],
	move: ["move"],
	description: ["description", "read-aloud"],
	clue: ["clue"],
	redClue: ["red-clue"],
};

export const DEFAULT_LEGEND_IN_THE_MIST_CALLOUT_ALIASES: LegendInTheMistCalloutAliases =
	{
		note: ["note"],
		readAloud: ["read-aloud"],
	};

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
	},
	calloutAliases: {
		cityOfMist: DEFAULT_CITY_OF_MIST_CALLOUT_ALIASES,
		legendInTheMist: DEFAULT_LEGEND_IN_THE_MIST_CALLOUT_ALIASES,
	},
};

const LOG_LEVELS: LogLevel[] = ["none", "error", "warn", "info", "debug"];
const COLOUR_SCHEMES: ColourScheme[] = ["obsidian", "light", "dark"];

export function sanitizeAlias(alias: string): string {
	return alias
		.trim()
		.toLowerCase()
		.replace(/^\[!?\s*/, "")
		.replace(/\]\s*$/, "")
		.replace(/^!\s*/, "")
		.replace(/\s+/g, "-");
}

export function sanitizeAliases(aliases: string[]): string[] {
	const unique = new Set<string>();

	for (const alias of aliases) {
		const sanitized = sanitizeAlias(alias);
		if (!sanitized) {
			continue;
		}

		unique.add(sanitized);
	}

	return Array.from(unique);
}

export function normalizeMode(mode: unknown): BrumesMode {
	// The colon was dropped from the identifier, not from the name.
	const id = mode === ":otherscape" ? "otherscape" : mode;

	if (findGamePack(id)) {
		return id as BrumesMode;
	}

	if (typeof mode === "string" && mode.length > 0) {
		modeLog.warn(
			`No game pack answers to "${mode}", falling back on "${DEFAULT_GAME_PACK_ID}".`,
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

function normalizeAliasList(
	value: unknown,
	fallback: string[],
): string[] {
	if (!Array.isArray(value)) {
		return [...fallback];
	}

	return sanitizeAliases(value.map(String));
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

export function normalizeSettings(
	data: Partial<BrumesSettings> | null | undefined,
): BrumesSettings {
	const source = data ?? {};
	const features: Partial<BrumesFeatureSettings> = source.features ?? {};
	const calloutAliases: Partial<BrumesCalloutAliasesSettings> =
		source.calloutAliases ?? {};
	const cityOfMist: Partial<CityOfMistCalloutAliases> =
		calloutAliases.cityOfMist ?? {};
	const legendInTheMist: Partial<LegendInTheMistCalloutAliases> =
		calloutAliases.legendInTheMist ?? {};

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
		calloutAliases: {
			cityOfMist: {
				note: normalizeAliasList(
					cityOfMist.note,
					DEFAULT_CITY_OF_MIST_CALLOUT_ALIASES.note,
				),
				move: normalizeAliasList(
					cityOfMist.move,
					DEFAULT_CITY_OF_MIST_CALLOUT_ALIASES.move,
				),
				description: normalizeAliasList(
					cityOfMist.description,
					DEFAULT_CITY_OF_MIST_CALLOUT_ALIASES.description,
				),
				clue: normalizeAliasList(
					cityOfMist.clue,
					DEFAULT_CITY_OF_MIST_CALLOUT_ALIASES.clue,
				),
				redClue: normalizeAliasList(
					cityOfMist.redClue,
					DEFAULT_CITY_OF_MIST_CALLOUT_ALIASES.redClue,
				),
			},
			legendInTheMist: {
				note: normalizeAliasList(
					legendInTheMist.note,
					DEFAULT_LEGEND_IN_THE_MIST_CALLOUT_ALIASES.note,
				),
				readAloud: normalizeAliasList(
					legendInTheMist.readAloud,
					DEFAULT_LEGEND_IN_THE_MIST_CALLOUT_ALIASES.readAloud,
				),
			},
		},
	};
}
