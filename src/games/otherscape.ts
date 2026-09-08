import { EMPTY_STYLE, GamePack } from "./types";

/**
 * :Otherscape.
 *
 * The pack is declared but empty: the game has no dressing of its own yet, and
 * an empty style writes no block at all rather than a half-finished one. Phase
 * 3 fills it.
 */
export const otherscapePack: GamePack = {
	id: "otherscape",
	label: ":Otherscape",
	style: EMPTY_STYLE,
};
