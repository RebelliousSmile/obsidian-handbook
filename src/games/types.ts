/**
 * The shape of a game pack.
 *
 * A pack describes a game as data: who it is, which custom properties it
 * writes, and where its illustrations live. It never contains CSS: the plugin
 * turns these tokens into one style block, and the SCSS keeps only what a
 * custom property cannot express.
 *
 * These types are the published shape, read the way TypeScript reads it. The
 * contract lives beside the content schemas, in schema-in-the-mist, as
 * `appearance/game-pack.schema.json`; `fromSchema.ts` turns a document of that
 * shape into the types below. Nothing at runtime reaches for that repository —
 * the schema describes the format, it does not serve it.
 *
 * The format is frozen. A field is never renamed or removed without a reading
 * path for the old form, because a pack lives in a user's vault as much as in
 * this source. The one difference between the document and the types is
 * optionality: a document may leave a layer out, the types always carry the
 * three, and the reader fills the gap with empty records rather than with
 * `undefined`.
 */

/** Custom property name to value, written verbatim into the style block. */
export type GameStyleTokens = Record<string, string>;

export interface GameStyleLayer {
	/** What dresses a note: fonts, colours, heading metrics. */
	note: GameStyleTokens;
	/** What repaints the interface around it, behind the workspace toggle. */
	workspace: GameStyleTokens;
}

export interface GameStyleValues {
	/** Applies whichever theme is active. */
	base: GameStyleLayer;
	light: GameStyleLayer;
	dark: GameStyleLayer;
}

/**
 * Where the illustrations of a game live in the vault.
 *
 * `root` is a vault path; `images` maps a role a block template asks for —
 * `theme-card-frame`, say — to a file under that root. A role a pack leaves
 * out is not an error: the template that asks for it degrades rather than
 * reserving a box for a picture that never comes.
 */
export interface GameFontFace {
	/** Relative to the pack's asset folder, like an image. */
	file: string;
	weight?: string;
	style?: string;
}

export interface GameAssets {
	root?: string;
	images?: Record<string, string>;
	/**
	 * The typefaces the pack asks for, by family name as the tokens spell it,
	 * to the file that carries the face. Writing :Otherscape showed the gap:
	 * a pack can name a family in `--font-text-theme` but nothing loads it,
	 * so a new game silently borrows whatever face another game's partial
	 * happened to emit.
	 *
	 * A bare string is the file; the long form exists because a family with a
	 * single face still has a weight, and a face declared without one is
	 * matched as regular and then synthetically emboldened.
	 */
	fonts?: Record<string, string | GameFontFace>;
}

export interface GamePack {
	/** Also the CSS class suffix: `brumes--<id>`. */
	id: string;
	/** Shown in the interface. Comes from the data, never from a literal. */
	label: string;
	style: GameStyleValues;
	assets?: GameAssets;
}

/**
 * An identifier ends up in a class name and in the user's `data.json`, so it
 * is restricted to what is safe in both: lowercase letters, digits, and single
 * hyphens between them.
 */
const GAME_PACK_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidGamePackId(id: unknown): id is string {
	return typeof id === "string" && GAME_PACK_ID_PATTERN.test(id);
}

export const EMPTY_LAYER: GameStyleLayer = { note: {}, workspace: {} };

export const EMPTY_STYLE: GameStyleValues = {
	base: EMPTY_LAYER,
	light: EMPTY_LAYER,
	dark: EMPTY_LAYER,
};
