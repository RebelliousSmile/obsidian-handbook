import { SchemaMeta } from "../blocks/schemaValues";
import { OsSpecial, OsThemeType } from "../otherscape/types";
import { parseOsThemeDocument } from "./schema";

export interface OsThemeData {
	titleTag: string;
	themeType: OsThemeType;
	category?: string;
	/** A kit's prose; a played theme has none in the contract. */
	description?: string;
	powerTags: string[];
	weaknessTags: string[];
	quest?: string;
	/** The one Theme Special a kit suggests, with the box ticked when taken. */
	special?: OsSpecial;
	upgrade?: number;
	decay?: number;
	meta?: SchemaMeta;
	isKit: boolean;
}

export function parseOsTheme(source: string): OsThemeData | null {
	return parseOsThemeDocument(source, false);
}

export function parseOsThemeKit(source: string): OsThemeData | null {
	return parseOsThemeDocument(source, true);
}
