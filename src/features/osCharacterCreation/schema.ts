import { stringify as stringifyToml } from "smol-toml";
import { asRecordList, asString, asStringList, readMeta, SchemaMeta } from "../blocks/schemaValues";
import { parseOtherscapeDocument } from "../otherscape/document";
import { OsThemeKitReference } from "../otherscape/types";
import { OsCharacterTropeData, OsCreationData, OsLoadoutItemData } from "./parser";

interface ReferenceDocument { title_tag: string; category: string; }
interface TropeDocument { name: string; category?: string; description?: string; theme_kits?: ReferenceDocument[]; choices?: ReferenceDocument[]; loadout?: string[]; meta?: SchemaMeta; }
interface ItemDocument { name: string; category?: string; description?: string; feature_tags?: string[]; weakness_tag?: string; meta?: SchemaMeta; }

function readReferences(value: unknown): OsThemeKitReference[] {
	const references: OsThemeKitReference[] = [];
	for (const entry of asRecordList(value)) {
		const titleTag = asString(entry.title_tag); const category = asString(entry.category);
		if (titleTag && category) references.push({ titleTag, category });
	}
	return references;
}

export function parseOsCreationDocument(source: string, kind: OsCreationData["kind"]): OsCreationData | null {
	const document = parseOtherscapeDocument(source); if (!document) return null;
	const name = asString(document.name); if (!name) return null;
	const category = asString(document.category); const description = asString(document.description); const meta = readMeta(document.meta);
	if (kind === "character-trope") {
		const data: OsCharacterTropeData = { kind, name, themeKits: readReferences(document.theme_kits), choices: readReferences(document.choices), loadout: asStringList(document.loadout) };
		if (category) data.category = category; if (description) data.description = description; if (meta) data.meta = meta; return data;
	}
	const data: OsLoadoutItemData = { kind, name, featureTags: asStringList(document.feature_tags) };
	const weaknessTag = asString(document.weakness_tag);
	if (category) data.category = category; if (description) data.description = description; if (weaknessTag) data.weaknessTag = weaknessTag; if (meta) data.meta = meta; return data;
}

export function osCreationToDocument(data: OsCreationData): TropeDocument | ItemDocument {
	const common = { name: data.name, ...(data.category ? { category: data.category } : {}), ...(data.description ? { description: data.description } : {}) };
	if (data.kind === "character-trope") {
		return { ...common, ...(data.themeKits.length ? { theme_kits: data.themeKits.map((reference) => ({ title_tag: reference.titleTag, category: reference.category })) } : {}), ...(data.choices.length ? { choices: data.choices.map((reference) => ({ title_tag: reference.titleTag, category: reference.category })) } : {}), ...(data.loadout.length ? { loadout: [...data.loadout] } : {}), ...(data.meta ? { meta: data.meta } : {}) };
	}
	return { ...common, ...(data.featureTags.length ? { feature_tags: [...data.featureTags] } : {}), ...(data.weaknessTag ? { weakness_tag: data.weaknessTag } : {}), ...(data.meta ? { meta: data.meta } : {}) };
}

export function osCreationToToml(data: OsCreationData): string {
	const toml = stringifyToml(osCreationToDocument(data)); return toml.endsWith("\n") ? toml : `${toml}\n`;
}
