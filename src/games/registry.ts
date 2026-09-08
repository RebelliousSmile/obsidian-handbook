import { logScope } from "../utils/logger";
import { cityOfMistPack } from "./city-of-mist";
import { legendInTheMistPack } from "./legend-in-the-mist";
import { otherscapePack } from "./otherscape";
import { EMPTY_STYLE, GamePack, isValidGamePackId } from "./types";

const log = logScope("Games");

/** Every game Handbook knows. Adding a game means adding a line here. */
const DECLARED_PACKS: GamePack[] = [
	cityOfMistPack,
	legendInTheMistPack,
	otherscapePack,
];

/**
 * A pack whose identifier is not safe as a class name is left out rather than
 * allowed to write a selector of its own. The others load as usual: one bad
 * pack costs its own game, not the plugin.
 */
function acceptPacks(packs: GamePack[]): GamePack[] {
	const accepted: GamePack[] = [];
	const seen: string[] = [];

	for (const pack of packs) {
		if (!isValidGamePackId(pack.id)) {
			log.error(
				`Ignoring a game pack: "${String(
					pack.id,
				)}" is not a valid identifier — lowercase letters, digits and single hyphens only.`,
			);
			continue;
		}

		if (seen.indexOf(pack.id) !== -1) {
			log.error(`Ignoring a second game pack declared as "${pack.id}".`);
			continue;
		}

		seen.push(pack.id);
		accepted.push(pack);
	}

	return accepted;
}

export const GAME_PACKS: GamePack[] = acceptPacks(DECLARED_PACKS);

export const DEFAULT_GAME_PACK_ID = "city-of-mist";

/** The class every pack claims on the body, and the plugin scopes its style by. */
export function gamePackClass(id: string): string {
	return `brumes--${id}`;
}

export function gamePackClasses(): string[] {
	const classes: string[] = [];

	for (const pack of GAME_PACKS) {
		classes.push(gamePackClass(pack.id));
	}

	return classes;
}

export function findGamePack(id: unknown): GamePack | null {
	for (const pack of GAME_PACKS) {
		if (pack.id === id) {
			return pack;
		}
	}

	return null;
}

/**
 * Never fails: an identifier nothing answers to falls back on the default
 * pack. A vault written by a later version, or by hand, opens on a game
 * instead of on an error.
 */
export function resolveGamePack(id: unknown): GamePack {
	const pack = findGamePack(id);
	if (pack) {
		return pack;
	}

	const fallback = findGamePack(DEFAULT_GAME_PACK_ID);
	if (fallback) {
		return fallback;
	}

	return GAME_PACKS.length > 0 ? GAME_PACKS[0] : UNDRESSED_PACK;
}

/** Only reachable if every declared pack was refused. Writes no style. */
const UNDRESSED_PACK: GamePack = {
	id: DEFAULT_GAME_PACK_ID,
	label: DEFAULT_GAME_PACK_ID,
	style: EMPTY_STYLE,
};
