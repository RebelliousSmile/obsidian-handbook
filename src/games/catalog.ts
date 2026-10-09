import catalog from "../../schemas/catalog.json";
import { isSafeSchemaSourceRepository, schemaSourceId } from "./sources";
import type { SchemaSource } from "./sources";

export interface CatalogSource extends SchemaSource {
	label: string;
}

/** Discovery only: games and their presentation remain schema-owned. */
export function readSchemaCatalog(value: unknown): CatalogSource[] {
	if (!value || typeof value !== "object") return [];
	const data = value as Record<string, unknown>;
	if (data.manifestVersion !== 1 || !Array.isArray(data.sources)) return [];
	const sources: CatalogSource[] = [];
	for (const entry of data.sources) {
		if (!entry || typeof entry !== "object") continue;
		const candidate = entry as Record<string, unknown>;
		if (!isSafeSchemaSourceRepository(candidate.repository) || typeof candidate.label !== "string" || !candidate.label.trim()) continue;
		if (candidate.repository.split("/").some((part) => part === "." || part === "..")) continue;
		const reference = candidate.reference as Record<string, unknown> | null;
		if (!reference || reference.kind !== "latest") continue;
		const id = schemaSourceId(candidate.repository);
		if (sources.some((source) => source.id === id)) continue;
		sources.push({ id, label: candidate.label.trim(), repository: candidate.repository, reference: { kind: "latest" } });
	}
	return sources;
}

export const SCHEMA_CATALOG = readSchemaCatalog(catalog);
