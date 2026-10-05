import { fr } from "./fr";
import type { Translations } from "./types";

/**
 * One entry per language, keyed by Obsidian's language code (`getLanguage()`,
 * region dropped). To add a language: copy `fr.ts` to `<code>.ts`, translate the
 * values (keep the keys and the `{placeholders}`), and list it here. A text
 * without an entry stays English.
 */
export const LOCALES: Record<string, Translations> = { fr };
