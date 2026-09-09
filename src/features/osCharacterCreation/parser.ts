import { SchemaMeta } from "../blocks/schemaValues";
import { OsThemeKitReference } from "../otherscape/types";
import { parseOsCreationDocument } from "./schema";

export interface OsCharacterTropeData {
	kind: "character-trope";
	name: string;
	category?: string;
	description?: string;
	themeKits: OsThemeKitReference[];
	choices: OsThemeKitReference[];
	loadout: string[];
	meta?: SchemaMeta;
}
export interface OsLoadoutItemData {
	kind: "loadout-item";
	name: string;
	category?: string;
	description?: string;
	featureTags: string[];
	weaknessTag?: string;
	meta?: SchemaMeta;
}
export type OsCreationData = OsCharacterTropeData | OsLoadoutItemData;
export const parseOsCharacterTrope = (source: string) => parseOsCreationDocument(source, "character-trope");
export const parseOsLoadoutItem = (source: string) => parseOsCreationDocument(source, "loadout-item");
