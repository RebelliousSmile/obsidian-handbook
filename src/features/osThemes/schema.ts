import { stringify as stringifyToml } from "smol-toml";
import {
	asNonNegativeInteger,
	asString,
	asStringList,
	readMeta,
	SchemaMeta,
} from "../blocks/schemaValues";
import { parseOtherscapeDocument } from "../otherscape/document";
import { OS_THEME_TYPES, OsSpecial, OsThemeType } from "../otherscape/types";
import { OsThemeData } from "./parser";

export interface OsThemeDocument {
	title_tag: string;
	theme_type: OsThemeType;
	description?: string;
	category?: string;
	power_tags?: string[];
	weakness_tags?: string[];
	quest?: string;
	special?: OsSpecial;
	upgrade?: number;
	decay?: number;
	meta?: SchemaMeta;
}

function readSpecial(value: unknown): OsSpecial | undefined {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
	const entry = value as Record<string, unknown>;
	const name = asString(entry.name);
	const description = asString(entry.description);
	return name && description ? { name, description } : undefined;
}

export function parseOsThemeDocument(
	source: string,
	isKit: boolean,
): OsThemeData | null {
	const document = parseOtherscapeDocument(source);
	return document ? readOsTheme(document, isKit) : null;
}

/** A theme read from its decoded table: a block's whole document, or one entry of a character's `themes`. */
export function readOsTheme(
	document: Record<string, unknown>,
	isKit: boolean,
): OsThemeData | null {
	const titleTag = asString(document.title_tag);
	const declaredType = asString(document.theme_type).toLowerCase();
	if (!titleTag || !OS_THEME_TYPES.includes(declaredType as OsThemeType)) {
		return null;
	}

	const data: OsThemeData = {
		titleTag,
		themeType: declaredType as OsThemeType,
		powerTags: asStringList(document.power_tags),
		weaknessTags: asStringList(document.weakness_tags),
		isKit,
	};
	const category = asString(document.category);
	const quest = asString(document.quest);
	const meta = readMeta(document.meta);
	if (category) data.category = category;
	if (quest) data.quest = quest;
	if (meta) data.meta = meta;

	const description = asString(document.description);
	const special = readSpecial(document.special);
	if (description) data.description = description;
	if (special) data.special = special;

	if (!isKit) {
		const upgrade = asNonNegativeInteger(document.upgrade, 3);
		const decay = asNonNegativeInteger(document.decay, 3);
		if (upgrade !== undefined) data.upgrade = upgrade;
		if (decay !== undefined) data.decay = decay;
	}

	return data;
}

export function osThemeToDocument(data: OsThemeData): OsThemeDocument {
	const document: OsThemeDocument = {
		title_tag: data.titleTag,
		theme_type: data.themeType,
	};
	if (data.description) document.description = data.description;
	if (data.category) document.category = data.category;
	if (data.powerTags.length) document.power_tags = [...data.powerTags];
	if (data.weaknessTags.length) document.weakness_tags = [...data.weaknessTags];
	if (data.quest) document.quest = data.quest;
	if (data.special) document.special = { ...data.special };
	if (!data.isKit && data.upgrade !== undefined) document.upgrade = data.upgrade;
	if (!data.isKit && data.decay !== undefined) document.decay = data.decay;
	if (data.meta) document.meta = data.meta;
	return document;
}

export function osThemeToToml(data: OsThemeData): string {
	const toml = stringifyToml(osThemeToDocument(data));
	return toml.endsWith("\n") ? toml : `${toml}\n`;
}
