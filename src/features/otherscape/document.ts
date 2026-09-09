import { parse as parseToml } from "smol-toml";
import { looksLikeToml } from "../blocks/schemaValues";

export type OtherscapeDocument = Record<string, unknown>;

/** The six formats accept their published TOML document and no parallel grammar. */
export function parseOtherscapeDocument(
	source: string,
): OtherscapeDocument | null {
	if (!looksLikeToml(source)) {
		return null;
	}

	try {
		const value: unknown = parseToml(source);
		return value !== null && typeof value === "object" && !Array.isArray(value)
			? (value as OtherscapeDocument)
			: null;
	} catch {
		return null;
	}
}
