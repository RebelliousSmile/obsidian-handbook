import { SchemaMeta } from "../blocks/schemaValues";
import { OsThemeType } from "../otherscape/types";
import { parseOsThemeDocument } from "./schema";

export interface OsThemeData {
	titleTag: string;
	themeType: OsThemeType;
	category?: string;
	powerTags: string[];
	weaknessTags: string[];
	quest?: string;
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
