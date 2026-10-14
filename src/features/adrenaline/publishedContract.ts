import monstreSchema from "schema-adrenaline/schemas/monstre.schema.json";
import pjSchema from "schema-adrenaline/schemas/pj.schema.json";
import pnjSchema from "schema-adrenaline/schemas/pnj.schema.json";
import { logScope } from "../../utils/logger";

/**
 * What the installed `schema-adrenaline` contract accepts, read from the JSON
 * Schemas it publishes: the characteristics and equipment lists of each sheet,
 * how many states a creature may enter, and whether a whole document is one the
 * contract refuses. Nothing is restated here, so a contract that moves is
 * followed and one that has not moved yet is not anticipated.
 */
export type AdrenalineSheet = "pj" | "pnj" | "monstre";

/** The part of JSON Schema (draft 7) the published schemas use, and a little more so that a contract that moves is still read. */
interface JsonSchema {
	$ref?: string;
	type?: string | string[];
	properties?: Record<string, JsonSchema>;
	required?: string[];
	additionalProperties?: boolean | JsonSchema;
	items?: JsonSchema;
	enum?: unknown[];
	const?: unknown;
	minimum?: number;
	maximum?: number;
	exclusiveMinimum?: number;
	exclusiveMaximum?: number;
	minItems?: number;
	maxItems?: number;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	oneOf?: JsonSchema[];
	anyOf?: JsonSchema[];
	allOf?: JsonSchema[];
}

const SCHEMAS: Record<AdrenalineSheet, JsonSchema> = {
	pj: pjSchema,
	pnj: pnjSchema as unknown as JsonSchema,
	monstre: monstreSchema as unknown as JsonSchema,
};
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

/** Whether the contract publishes the JSON pointer of a sheet as a list (`type: "array"`), whatever the document holds. */
export function publishedAsList(sheet: AdrenalineSheet, pointer: string): boolean {
	const found = pointer.slice(1).split("/").reduce<JsonSchema | undefined>((schema, key) => schema?.properties?.[key], SCHEMAS[sheet]);
	return found?.type === "array";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function matchesType(type: string, value: unknown): boolean {
	switch (type) {
		case "string": return typeof value === "string";
		case "boolean": return typeof value === "boolean";
		case "null": return value === null;
		case "array": return Array.isArray(value);
		case "object": return isRecord(value);
		case "number": return (typeof value === "number" && isFinite(value)) || typeof value === "bigint";
		case "integer": return (typeof value === "number" && isFinite(value) && Math.floor(value) === value) || typeof value === "bigint";
		default: return false;
	}
}

function sameValue(left: unknown, right: unknown): boolean {
	return left === right || (typeof left === "object" && typeof right === "object" && JSON.stringify(left) === JSON.stringify(right));
}

/** An internal reference (`#`, `#/definitions/x`) read from the sheet's own schema. */
function resolveReference(root: JsonSchema, reference: string): JsonSchema | undefined {
	if (reference === "#") return root;
	if (reference.indexOf("#/") !== 0) return undefined;
	return reference.slice(2).split("/").reduce<unknown>((found, token) => (isRecord(found) ? found[token.split("~1").join("/").split("~0").join("~")] : undefined), root) as JsonSchema | undefined;
}

/**
 * Walks a document against the schema the contract publishes for its sheet and names the first thing the
 * contract refuses: a missing required key, a key an object closed by `additionalProperties: false` does not
 * publish, a value of another type, outside its enumeration or constant, outside its bounds, or one that no
 * (`anyOf`) or not exactly one (`oneOf`) of its alternatives accepts. Nothing here is a reading of the document:
 * the schema is the only source.
 */
export function schemaRefusal(schema: JsonSchema, value: unknown, path: string, sheet: AdrenalineSheet, root: JsonSchema): string | undefined {
	const here = path || "the document";
	if (schema.$ref !== undefined) {
		const target = resolveReference(root, schema.$ref);
		return target ? schemaRefusal(target, value, path, sheet, root) : `"${here}" refers to ${schema.$ref}, which the contract does not publish.`;
	}
	if (schema.type !== undefined) {
		const types = Array.isArray(schema.type) ? schema.type : [schema.type];
		if (!types.some((type) => matchesType(type, value))) return `"${here}" must be ${types.join(" or ")}.`;
	}
	if (schema.enum && !schema.enum.some((allowed) => sameValue(allowed, value))) {
		return `"${here}" is ${JSON.stringify(value)}, the contract allows ${schema.enum.map((allowed) => JSON.stringify(allowed)).join(", ")}.`;
	}
	if ("const" in schema && !sameValue(schema.const, value)) return `"${here}" must be ${JSON.stringify(schema.const)}.`;
	if (typeof value === "string") {
		if (schema.minLength !== undefined && value.length < schema.minLength) return `"${here}" is shorter than ${schema.minLength}.`;
		if (schema.maxLength !== undefined && value.length > schema.maxLength) return `"${here}" is longer than ${schema.maxLength}.`;
		if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) return `"${here}" is "${value}", which does not match ${schema.pattern}.`;
	}
	if (typeof value === "number" || typeof value === "bigint") {
		const number = Number(value);
		if (schema.minimum !== undefined && number < schema.minimum) return `"${here}" is ${number}, below ${schema.minimum}.`;
		if (schema.maximum !== undefined && number > schema.maximum) return `"${here}" is ${number}, above ${schema.maximum}.`;
		if (schema.exclusiveMinimum !== undefined && number <= schema.exclusiveMinimum) return `"${here}" is ${number}, not above ${schema.exclusiveMinimum}.`;
		if (schema.exclusiveMaximum !== undefined && number >= schema.exclusiveMaximum) return `"${here}" is ${number}, not below ${schema.exclusiveMaximum}.`;
	}
	if (Array.isArray(value)) {
		if (schema.minItems !== undefined && value.length < schema.minItems) return `"${here}" holds ${value.length} entries, the contract needs at least ${schema.minItems}.`;
		if (schema.maxItems !== undefined && value.length > schema.maxItems) return `"${here}" holds ${value.length} entries, the contract allows ${schema.maxItems}.`;
		if (schema.items) {
			for (let index = 0; index < value.length; index++) {
				const reason = schemaRefusal(schema.items, value[index], `${path}[${index}]`, sheet, root);
				if (reason) return reason;
			}
		}
	}
	if (isRecord(value)) {
		for (const key of schema.required ?? []) {
			if (value[key] === undefined) return `"${path ? `${path}.${key}` : key}" is required by the contract.`;
		}
		for (const key of Object.keys(value)) {
			const at = path ? `${path}.${key}` : key;
			const declared = schema.properties?.[key];
			if (declared) {
				const reason = schemaRefusal(declared, value[key], at, sheet, root);
				if (reason) return reason;
			} else if (schema.additionalProperties === false) {
				return `"${at}" is not a ${sheet} key.`;
			} else if (isRecord(schema.additionalProperties)) {
				const reason = schemaRefusal(schema.additionalProperties, value[key], at, sheet, root);
				if (reason) return reason;
			}
		}
	}
	for (const branch of schema.allOf ?? []) {
		const reason = schemaRefusal(branch, value, path, sheet, root);
		if (reason) return reason;
	}
	if (schema.anyOf) {
		const reasons = schema.anyOf.map((branch) => schemaRefusal(branch, value, path, sheet, root));
		if (reasons.every((reason) => reason !== undefined)) return `"${here}" matches none of the ${reasons.length} forms the contract publishes (${String(reasons[0])})`;
	}
	if (schema.oneOf) {
		const reasons = schema.oneOf.map((branch) => schemaRefusal(branch, value, path, sheet, root));
		const accepted = reasons.filter((reason) => reason === undefined).length;
		if (accepted === 0) return `"${here}" matches none of the ${reasons.length} forms the contract publishes (${String(reasons[0])})`;
		if (accepted > 1) return `"${here}" matches ${accepted} of the ${reasons.length} forms the contract publishes, it must match exactly one.`;
	}
	return undefined;
}

/**
 * What the contract refuses and its published JSON Schema cannot say: the package states it itself ("validate only
 * the structural shape", the creature description) and enforces it in its public codecs. Two rules, each replayed
 * against the corpus the package publishes (`assert:adrenaline-contract`), so a drift shows there.
 *  - every `{ minimum, current, maximum }` range keeps minimum <= current <= maximum;
 *  - a creature does not mix `etatAlternatif` with `etats` (even empty) or `etatActif`.
 */
function playableRangeRefusal(value: unknown, path: string): string | undefined {
	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index++) {
			const reason = playableRangeRefusal(value[index], `${path}[${index}]`);
			if (reason) return reason;
		}
		return undefined;
	}
	if (!isRecord(value)) return undefined;
	const { minimum, current, maximum } = value;
	if (typeof minimum === "number" && typeof current === "number" && typeof maximum === "number") {
		if (minimum > current) return `"${path}" has a minimum above its current value.`;
		if (current > maximum) return `"${path}" has a current value above its maximum.`;
	}
	for (const key of Object.keys(value)) {
		const reason = playableRangeRefusal(value[key], path ? `${path}.${key}` : key);
		if (reason) return reason;
	}
	return undefined;
}

function codecRefusal(sheet: AdrenalineSheet, document: Record<string, unknown>): string | undefined {
	const range = playableRangeRefusal(document, "");
	if (range) return range;
	if (sheet === "monstre" && document.etatAlternatif && (document.etats || document.etatActif)) {
		return `"etatAlternatif" is mixed with "etats" or "etatActif", which the contract refuses.`;
	}
	return undefined;
}

/**
 * Why the contract refuses this document, naming the key; undefined when it
 * does not. The reason is also logged, since the refusal itself (`parse`
 * returning null) carries no message.
 */
export function contractRefusal(sheet: AdrenalineSheet, document: Record<string, unknown>): string | undefined {
	const reason = schemaRefusal(SCHEMAS[sheet], document, "", sheet, SCHEMAS[sheet]) ?? codecRefusal(sheet, document);
	if (reason) log.warn(`The ${sheet} document is refused by the installed contract: ${reason}`);
	return reason;
}
