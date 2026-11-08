import { SchemaMeta } from "../blocks/schemaValues";
import { OsSpecial, OsThemeType } from "../otherscape/types";
import { parseOsThemeDocument } from "./schema";

export interface OsThemeData {
	titleTag: string;
	themeType: OsThemeType;
	category?: string;
	/** The prose printed on the card: a kit's, or a played theme's when its card prints one. */
	description?: string;
	powerTags: string[];
	weaknessTags: string[];
	quest?: string;
	/** The Theme Special a kit suggests, or the one a played theme's card prints. */
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
