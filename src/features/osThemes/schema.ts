import { stringify as stringifyToml } from "smol-toml";
import {
	asNonNegativeInteger,
	asString,
	asStringList,
	readMeta,
	SchemaMeta,
} from "../blocks/schemaValues";
import { parseOtherscapeDocument } from "../otherscape/document";
import { OS_THEME_TYPES, OsThemeType } from "../otherscape/types";
import { OsThemeData } from "./parser";

export interface OsThemeDocument {
	title_tag: string;
	theme_type: OsThemeType;
	category?: string;
	power_tags?: string[];
	weakness_tags?: string[];
	quest?: string;
	upgrade?: number;
	decay?: number;
	meta?: SchemaMeta;
}

export function parseOsThemeDocument(
	source: string,
	isKit: boolean,
): OsThemeData | null {
	const document = parseOtherscapeDocument(source);
	if (!document) return null;

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
	if (data.category) document.category = data.category;
	if (data.powerTags.length) document.power_tags = [...data.powerTags];
	if (data.weaknessTags.length) document.weakness_tags = [...data.weaknessTags];
	if (data.quest) document.quest = data.quest;
	if (!data.isKit && data.upgrade !== undefined) document.upgrade = data.upgrade;
	if (!data.isKit && data.decay !== undefined) document.decay = data.decay;
	if (data.meta) document.meta = data.meta;
	return document;
}

export function osThemeToToml(data: OsThemeData): string {
	const toml = stringifyToml(osThemeToDocument(data));
	return toml.endsWith("\n") ? toml : `${toml}\n`;
}
