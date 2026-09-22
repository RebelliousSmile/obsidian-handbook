/** A public GitHub repository registered as a Handbook schema source. */
export interface SchemaSource {
	repository: string;
	/** Stable, filesystem-safe identity derived from the canonical repository. */
	id: string;
	reference: SchemaSourceReference;
}

export type SchemaSourceReference =
	| { kind: "latest" }
	| { kind: "tag"; value: string }
	| { kind: "branch"; value: string };

/** Immutable result recorded only after a complete source promotion. */
export interface InstalledSchemaSource {
	repository: string;
	id: string;
	reference: SchemaSourceReference;
	revision: string;
	/** Published release tag, when the source follows a release or a tag. */
	releaseTag?: string;
	checkedAt: string;
}

export function installedSchemaVersion(source: InstalledSchemaSource | null): string | null {
	if (!source) return null;
	if (typeof source.releaseTag === "string" && source.releaseTag.length > 0) return source.releaseTag;
	if (source.reference.kind === "tag") return source.reference.value;
	return `revision ${source.revision.slice(0, 7)}`;
}

export function schemaSourceId(repository: string): string {
	return repository.trim().toLowerCase().replace("/", "--");
}

export function isSafeSchemaSourceRepository(value: unknown): value is string {
	return typeof value === "string" && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value);
}
