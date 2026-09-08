/**
 * The shape of a game pack.
 *
 * A pack describes a game as data: who it is, which custom properties it
 * writes, and — from phase 4 on — where its illustrations live. It never
 * contains CSS: the plugin turns these tokens into one style block, and the
 * SCSS keeps only what a custom property cannot express.
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
 * Declared now and read from phase 4 on, so that moving the assets out of the
 * bundle does not reopen the format. `root` is a vault path; `images` maps a
 * role a block template asks for — `theme-card-frame`, say — to a file under
 * that root.
 */
export interface GameAssets {
	root?: string;
	images?: Record<string, string>;
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
