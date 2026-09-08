/**
 * The pieces every schema-in-the-mist document shares: the readers that turn
 * whatever TOML handed us into the type we expected, and the attribution block
 * that a Danger and a challenge carry identically.
 *
 * Nothing here validates. A document that gets a field wrong loses that field
 * rather than failing to render, because the block it feeds is being typed in
 * a note and is wrong most of the time it is looked at.
 */

/** Attribution, as the shared schema names it. */
export interface SchemaMeta {
	publication_type?: string;
	source?: string;
	authors?: string[];
	page?: number;
}

export function asString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

export function asStringList(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const list: string[] = [];

	for (const item of value) {
		const text = asString(item);

		if (text) {
			list.push(text);
		}
	}

	return list;
}

export function asRecordList(value: unknown): Record<string, unknown>[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const list: Record<string, unknown>[] = [];

	for (const item of value) {
		if (item !== null && typeof item === "object" && !Array.isArray(item)) {
			list.push(item as Record<string, unknown>);
		}
	}

	return list;
}

/**
 * Attribution is read and written back untouched. The plugin shows a source
 * line from it and does nothing else with it: a profile that arrives credited
 * leaves credited.
 */
export function readMeta(value: unknown): SchemaMeta | undefined {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return undefined;
	}

	const entry = value as Record<string, unknown>;
	const meta: SchemaMeta = {};
	let filled = false;

	const publicationType = asString(entry.publication_type);

	if (publicationType) {
		meta.publication_type = publicationType;
		filled = true;
	}

	const source = asString(entry.source);

	if (source) {
		meta.source = source;
		filled = true;
	}

	const authors = asStringList(entry.authors);

	if (authors.length > 0) {
		meta.authors = authors;
		filled = true;
	}

	if (typeof entry.page === "number") {
		meta.page = entry.page;
		filled = true;
	}

	return filled ? meta : undefined;
}

/**
 * The one line the attribution is worth on screen: where the profile comes
 * from, who wrote it, and the page it sits on. An empty string when the
 * attribution says none of that.
 */
export function metaSourceLine(meta: SchemaMeta): string {
	const parts: string[] = [];

	if (meta.source) {
		parts.push(meta.source);
	}

	if (meta.authors && meta.authors.length > 0) {
		parts.push(meta.authors.join(", "));
	}

	if (typeof meta.page === "number") {
		parts.push(`p. ${meta.page}`);
	}

	return parts.join(" · ");
}

/**
 * A TOML document opens on a `key =` line or on a table header; the terse
 * grammars all open on the profile name, which is neither. A block is only
 * offered to the document reader when it announces itself this way.
 */
export function looksLikeToml(source: string): boolean {
	for (const raw of source.split("\n")) {
		const line = raw.trim();

		if (line.length === 0 || line.charAt(0) === "#") {
			continue;
		}

		if (line.charAt(0) === "[") {
			return true;
		}

		const equals = line.indexOf("=");

		return equals > 0 && line.slice(0, equals).trim().indexOf(" ") === -1;
	}

	return false;
}
