import { SchemaMeta } from "../blocks/schemaValues";

export const OS_BLOCK_IDS = {
	theme: "os-theme",
	themeKit: "os-theme-kit",
	challenge: "os-challenge",
	powerSet: "os-power-set",
	characterTrope: "os-character-trope",
	loadoutItem: "os-loadout-item",
} as const;

export const OS_FEATURE_FLAGS = {
	theme: "osThemeParser",
	themeKit: "osThemeKitParser",
	challenge: "osChallengeParser",
	powerSet: "osPowerSetParser",
	characterTrope: "osCharacterTropeParser",
	loadoutItem: "osLoadoutItemParser",
} as const;

export type OsThemeType = "self" | "mythos" | "noise" | "crew";
export const OS_THEME_TYPES: OsThemeType[] = ["self", "mythos", "noise", "crew"];

export interface OsSpecial {
	name: string;
	description: string;
}

export interface OsThreat {
	name: string;
	description: string;
	consequences: string[];
}

export interface OsThemeKitReference {
	titleTag: string;
	category: string;
}

export interface OsAttributed {
	meta?: SchemaMeta;
}
