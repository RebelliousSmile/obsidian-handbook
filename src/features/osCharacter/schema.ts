import { stringify as stringifyToml } from "smol-toml";
import { asBoolean, asInteger, asRecordList, asString, asStringList, readMeta, SchemaMeta } from "../blocks/schemaValues";
import { parseOtherscapeDocument } from "../otherscape/document";
import { OsThemeData } from "../osThemes/parser";
import { OsThemeDocument, osThemeToDocument, readOsTheme } from "../osThemes/schema";
import { OsCharacterData, OsCharacterLoadoutItem, OsTagCombo } from "./parser";

/** The contract's ceiling: a character prints four themes at most. */
const MAX_THEMES = 4;

interface TagComboDocument { label: string; tags: string[]; power: number; effect: string; }
interface LoadoutItemDocument { name: string; feature_tags?: string[]; weakness_tag?: string; loaded?: boolean; }
interface OsCharacterDocument {
	name: string;
	themes?: OsThemeDocument[];
	tag_combos?: TagComboDocument[];
	loadout?: LoadoutItemDocument[];
	meta?: SchemaMeta;
}

/** The character's themes, tolerantly: an unreadable theme, a crew theme or a fifth theme is left out. */
function readThemes(value: unknown): OsThemeData[] {
	const themes: OsThemeData[] = [];
	for (const entry of asRecordList(value)) {
		if (themes.length === MAX_THEMES) break;
		const theme = readOsTheme(entry, false);
		if (theme && theme.themeType !== "crew") themes.push(theme);
	}
	return themes;
}

function readTagCombos(value: unknown): OsTagCombo[] {
	const combos: OsTagCombo[] = [];
	for (const entry of asRecordList(value)) {
		const label = asString(entry.label);
		const tags = asStringList(entry.tags);
		const power = asInteger(entry.power, 0);
		const effect = asString(entry.effect);
		if (label && tags.length && power !== undefined && effect) combos.push({ label, tags, power, effect });
	}
	return combos;
}

function readLoadout(value: unknown): OsCharacterLoadoutItem[] {
	const items: OsCharacterLoadoutItem[] = [];
	for (const entry of asRecordList(value)) {
		const name = asString(entry.name);
		if (!name) continue;
		// An item without `loaded` is read as not loaded: loadout tags are burnt by default.
		const item: OsCharacterLoadoutItem = { name, featureTags: asStringList(entry.feature_tags), loaded: asBoolean(entry.loaded) ?? false };
		const weaknessTag = asString(entry.weakness_tag);
		if (weaknessTag) item.weaknessTag = weaknessTag;
		items.push(item);
	}
	return items;
}

export function parseOsCharacterDocument(source: string): OsCharacterData | null {
	const document = parseOtherscapeDocument(source);
	if (!document) return null;
	const name = asString(document.name);
	if (!name) return null;
	const data: OsCharacterData = {
		name,
		themes: readThemes(document.themes),
		tagCombos: readTagCombos(document.tag_combos),
		loadout: readLoadout(document.loadout),
	};
	const meta = readMeta(document.meta);
	if (meta) data.meta = meta;
	return data;
}

export function osCharacterToDocument(data: OsCharacterData): OsCharacterDocument {
	const document: OsCharacterDocument = { name: data.name };
	if (data.themes.length) document.themes = data.themes.map(osThemeToDocument);
	if (data.tagCombos.length) {
		document.tag_combos = data.tagCombos.map((combo) => ({ label: combo.label, tags: [...combo.tags], power: combo.power, effect: combo.effect }));
	}
	if (data.loadout.length) {
		document.loadout = data.loadout.map((item) => {
			const entry: LoadoutItemDocument = { name: item.name };
			if (item.featureTags.length) entry.feature_tags = [...item.featureTags];
			if (item.weaknessTag) entry.weakness_tag = item.weaknessTag;
			if (item.loaded) entry.loaded = true;
			return entry;
		});
	}
	if (data.meta) document.meta = data.meta;
	return document;
}

export function osCharacterToToml(data: OsCharacterData): string {
	const toml = stringifyToml(osCharacterToDocument(data));
	return toml.endsWith("\n") ? toml : `${toml}\n`;
}
