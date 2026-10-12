import monstreSchema from "schema-adrenaline/schemas/monstre.schema.json";
import pjSchema from "schema-adrenaline/schemas/pj.schema.json";
import pnjSchema from "schema-adrenaline/schemas/pnj.schema.json";
import { logScope } from "../../utils/logger";

/**
 * What the installed `schema-adrenaline` contract accepts, read from the JSON
 * Schemas it publishes: the characteristics and equipment lists of each sheet,
 * and how many states a creature may enter. Nothing is restated here, so a
 * contract that moves is followed and one that has not moved yet is not
 * anticipated. A key the contract does not know at all is only ignored (the
 * readers warn); a key it knows on another sheet but not on this one, or more
 * states than it allows, is a document the contract refuses.
 */
export type AdrenalineSheet = "pj" | "pnj" | "monstre";

interface JsonSchema {
	properties?: Record<string, JsonSchema>;
	items?: JsonSchema;
	maxItems?: number;
}

const SCHEMAS: Record<AdrenalineSheet, JsonSchema> = {
	pj: pjSchema as unknown as JsonSchema,
	pnj: pnjSchema as unknown as JsonSchema,
	monstre: monstreSchema as unknown as JsonSchema,
};
const SHEETS: readonly AdrenalineSheet[] = ["pj", "pnj", "monstre"];
const log = logScope("Adrenaline");

function propertyKeys(schema: JsonSchema | undefined): string[] {
	return schema?.properties ? Object.keys(schema.properties) : [];
}

/** The characteristics a sheet publishes. */
export function publishedCharacteristicKeys(sheet: AdrenalineSheet): string[] {
	return propertyKeys(SCHEMAS[sheet].properties?.caracteristiques);
}

/** The equipment keys a sheet publishes. */
export function publishedEquipmentKeys(sheet: AdrenalineSheet): string[] {
	return propertyKeys(SCHEMAS[sheet].properties?.equipement);
}

/** The equipment keys the state of a creature may overlay. */
function publishedStateEquipmentKeys(): string[] {
	return propertyKeys(SCHEMAS.monstre.properties?.etats?.items?.properties?.delta?.properties?.equipement);
}

/** How many states besides its base a creature may enter, when the contract bounds it. */
export function publishedMaximumStates(): number | undefined {
	return SCHEMAS.monstre.properties?.etats?.maxItems;
}

function union(read: (sheet: AdrenalineSheet) => string[]): string[] {
	return SHEETS.reduce<string[]>((all, sheet) => all.concat(read(sheet).filter((key) => all.indexOf(key) < 0)), []);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** The keys of `record` that the contract knows on some sheet but not on this one. */
function foreignKeys(record: unknown, sheetKeys: string[], knownKeys: string[]): string[] {
	return isRecord(record) ? Object.keys(record).filter((key) => knownKeys.indexOf(key) >= 0 && sheetKeys.indexOf(key) < 0) : [];
}

function refusalOf(sheet: AdrenalineSheet, document: Record<string, unknown>): string | undefined {
	const characteristics = publishedCharacteristicKeys(sheet);
	const knownCharacteristics = union(publishedCharacteristicKeys);
	const places: [string, unknown][] = [["caracteristiques", document.caracteristiques]];
	if (sheet === "monstre") {
		places.push(["etatAlternatif.caracteristiques", isRecord(document.etatAlternatif) ? document.etatAlternatif.caracteristiques : undefined]);
		if (Array.isArray(document.etats)) {
			document.etats.forEach((state: unknown, index: number) => {
				const delta = isRecord(state) ? state.delta : undefined;
				places.push([`etats[${index}].delta.caracteristiques`, isRecord(delta) ? delta.caracteristiques : undefined]);
			});
		}
	}
	for (const [path, record] of places) {
		const foreign = foreignKeys(record, characteristics, knownCharacteristics);
		if (foreign.length > 0) return `"${path}.${foreign[0]}" is not a ${sheet} key.`;
	}
	const knownEquipment = union(publishedEquipmentKeys);
	const equipment: [string, unknown, string[]][] = [["equipement", document.equipement, publishedEquipmentKeys(sheet)]];
	if (sheet === "monstre" && Array.isArray(document.etats)) {
		const stateEquipment = publishedStateEquipmentKeys();
		document.etats.forEach((state: unknown, index: number) => {
			const delta = isRecord(state) ? state.delta : undefined;
			equipment.push([`etats[${index}].delta.equipement`, isRecord(delta) ? delta.equipement : undefined, stateEquipment]);
		});
	}
	for (const [path, record, sheetKeys] of equipment) {
		const foreign = foreignKeys(record, sheetKeys, knownEquipment);
		if (foreign.length > 0) return `"${path}.${foreign[0]}" is not a ${sheet} key.`;
	}
	const maximum = publishedMaximumStates();
	if (sheet === "monstre" && maximum !== undefined && Array.isArray(document.etats) && document.etats.length > maximum) {
		return `"etats" holds ${document.etats.length} entries, the contract allows ${maximum}.`;
	}
	return undefined;
}

/**
 * Why the contract refuses this document, naming the key; undefined when it
 * does not. The reason is also logged, since the refusal itself (`parse`
 * returning null) carries no message.
 */
export function contractRefusal(sheet: AdrenalineSheet, document: Record<string, unknown>): string | undefined {
	const reason = refusalOf(sheet, document);
	if (reason) log.warn(`The ${sheet} document is refused by the installed contract: ${reason}`);
	return reason;
}
