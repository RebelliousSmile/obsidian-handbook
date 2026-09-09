import { logScope } from "../utils/logger";
import { adrenalinePack } from "./adrenaline";
import { cityOfMistPack } from "./city-of-mist";
import { legendInTheMistPack } from "./legend-in-the-mist";
import { otherscapePack, otherscapeVariants } from "./otherscape";
import { EMPTY_STYLE, GamePack, isValidGamePackId } from "./types";
import {
	GameRegistration,
	gameVariantClass,
	isValidGameVariantId,
	resolveGameVariant,
} from "./variants";

const log = logScope("Games");

/**
 * A pack id already reported as colliding this session stays silent on a
 * later call — `initGameRegistry` may run more than once (a harness replaying
 * `onload`), and a collision is worth a warning, not one per replay.
 */
const reportedConflicts: string[] = [];

function reportConflictOnce(id: string, message: string): void {
	if (reportedConflicts.indexOf(id) !== -1) {
		return;
	}

	reportedConflicts.push(id);
	log.error(message);
}

/** Every game Handbook knows. Adding a game means adding a line here. */
const DECLARED_GAMES: GameRegistration[] = [
	{ pack: cityOfMistPack },
	{ pack: legendInTheMistPack },
	{
		pack: otherscapePack,
		variants: otherscapeVariants,
		defaultVariantId: "metro",
	},
	{ pack: adrenalinePack },
];

/**
 * A pack whose identifier is not safe as a class name is left out rather than
 * allowed to write a selector of its own. The others load as usual: one bad
 * pack costs its own game, not the plugin.
 */
function acceptRegistrations(
	registrations: GameRegistration[],
): GameRegistration[] {
	const accepted: GameRegistration[] = [];
	const seen: string[] = [];

	for (const registration of registrations) {
		const pack = registration.pack;
		if (!isValidGamePackId(pack.id)) {
			log.error(
				`Ignoring a game pack: "${String(
					pack.id,
				)}" is not a valid identifier — lowercase letters, digits and single hyphens only.`,
			);
			continue;
		}

		if (seen.indexOf(pack.id) !== -1) {
			reportConflictOnce(
				pack.id,
				`Ignoring a second game pack declared as "${pack.id}".`,
			);
			continue;
		}

		seen.push(pack.id);
		const variantIds: string[] = [];
		const variants = (registration.variants ?? []).filter((variant) => {
			if (!isValidGameVariantId(variant.id)) {
				log.error(
					`Ignoring invalid variant "${String(variant.id)}" for "${pack.id}".`,
				);
				return false;
			}
			if (variantIds.includes(variant.id)) {
				log.error(
					`Ignoring duplicate variant "${variant.id}" for "${pack.id}".`,
				);
				return false;
			}
			variantIds.push(variant.id);
			return true;
		});

		accepted.push({ ...registration, variants });
	}

	return accepted;
}

export const GAME_REGISTRATIONS: GameRegistration[] =
	acceptRegistrations(DECLARED_GAMES);

/** Kept as the public list of bare packs for existing consumers. */
export const GAME_PACKS: GamePack[] = GAME_REGISTRATIONS.map(
	(registration) => registration.pack,
);

/** Exposed for the throwaway harness, which asserts the once-per-session rule. */
export function resetGameRegistryReports(): void {
	reportedConflicts.length = 0;
}

/**
 * Merges `DECLARED_GAMES` with packs read from the vault, and refills
 * `GAME_REGISTRATIONS`/`GAME_PACKS` in place — never reassigned, since several
 * files hold a direct reference to these arrays taken at import time.
 *
 * A custom pack never carries variants. One whose id collides with a declared
 * game loses to it, logged once; two custom packs sharing an id keep only the
 * first — callers sort their files before calling, so that first claim is
 * deterministic.
 */
export function initGameRegistry(customPacks: GamePack[]): void {
	const customRegistrations: GameRegistration[] = customPacks.map((pack) => ({
		pack,
	}));

	const accepted = acceptRegistrations([
		...DECLARED_GAMES,
		...customRegistrations,
	]);

	GAME_REGISTRATIONS.length = 0;
	GAME_REGISTRATIONS.push(...accepted);

	GAME_PACKS.length = 0;
	GAME_PACKS.push(...GAME_REGISTRATIONS.map((registration) => registration.pack));
}

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

export function gameVariantClasses(): string[] {
	const classes: string[] = [];
	for (const registration of GAME_REGISTRATIONS) {
		for (const variant of registration.variants ?? []) {
			classes.push(gameVariantClass(variant.id));
		}
	}
	return classes;
}

export function findGameRegistration(id: unknown): GameRegistration | null {
	for (const registration of GAME_REGISTRATIONS) {
		if (registration.pack.id === id) {
			return registration;
		}
	}
	return null;
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

export function resolveGameRegistration(id: unknown): GameRegistration {
	return (
		findGameRegistration(id) ??
		findGameRegistration(DEFAULT_GAME_PACK_ID) ??
		GAME_REGISTRATIONS[0] ?? { pack: UNDRESSED_PACK }
	);
}

export function normalizeGameVariantId(
	gameId: unknown,
	variantId: unknown,
): string | null {
	return resolveGameVariant(resolveGameRegistration(gameId), variantId)?.id ?? null;
}

/** Only reachable if every declared pack was refused. Writes no style. */
const UNDRESSED_PACK: GamePack = {
	id: DEFAULT_GAME_PACK_ID,
	label: DEFAULT_GAME_PACK_ID,
	style: EMPTY_STYLE,
};
