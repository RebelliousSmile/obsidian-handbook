import { getLanguage } from "obsidian";
import { LOCALES } from "../locales";

/** The texts of the interface language, empty when there is no translation (English). */
function translationsFor(language: string): Record<string, string> {
	const code = language.toLowerCase().split(/[-_]/)[0] ?? "";
	return Object.prototype.hasOwnProperty.call(LOCALES, code) ? LOCALES[code] : {};
}

/** `text` in Obsidian's interface language, `{name}` placeholders filled from `values`. */
export function t(
	text: string,
	values: Record<string, string | number> = {},
	language: string = getLanguage(),
): string {
	const template = translationsFor(language)[text] ?? text;
	return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
		name in values ? String(values[name]) : whole);
}

/** How a TOML export names its block ("theme card"), with its article where the language has one. */
export function tNoun(noun: string, language: string = getLanguage()): string {
	return translationsFor(language)[`noun:${noun}`] ?? noun;
}
