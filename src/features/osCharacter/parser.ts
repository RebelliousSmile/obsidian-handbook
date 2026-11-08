import { SchemaMeta } from "../blocks/schemaValues";
import { OsThemeData } from "../osThemes/parser";
import { parseOsCharacterDocument } from "./schema";

/** A tag combo prepared on the sheet: the tags combined, the Power obtained and the effect aimed at. */
export interface OsTagCombo {
	label: string;
	tags: string[];
	power: number;
	/** Inline Markdown: an action word and the status or tags it targets. */
	effect: string;
}

/** One item of the loadout theme. Its tags are burnt until it is loaded. */
export interface OsCharacterLoadoutItem {
	name: string;
	featureTags: string[];
	weaknessTag?: string;
	loaded: boolean;
}

export interface OsCharacterData {
	name: string;
	/** At most four, none of them a crew theme. */
	themes: OsThemeData[];
	tagCombos: OsTagCombo[];
	loadout: OsCharacterLoadoutItem[];
	meta?: SchemaMeta;
}

export function parseOsCharacter(source: string): OsCharacterData | null {
	return parseOsCharacterDocument(source);
}
