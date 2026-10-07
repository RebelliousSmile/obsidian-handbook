import { GameStyleOverride, mergeGameStyle } from "./overrides";
import { logScope } from "../utils/logger";
import {
	GamePack,
	GamePolarity,
	GameStyleTokens,
	GameStyleValues,
	isValidGamePackId,
	sectionTokens,
} from "./types";
import type { GamePluginInstallation } from "./pluginManifest";

export interface GameVariant {
	id: string;
	label: string;
	style: GameStyleOverride;
	polarities: GamePolarity[];
}

/** Internal registry metadata. It deliberately never enters GamePack serialization. */
export interface GameRegistration {
	pack: GamePack;
	variants?: GameVariant[];
	defaultVariantId?: string;
	/** Present only when the pack came from an installed game plugin. */
	installation?: GamePluginInstallation;
}

export interface ResolvedGameAppearance {
	pack: GamePack;
	variant: GameVariant | null;
	style: GameStyleValues;
	polarities: GamePolarity[];
}

export function isValidGameVariantId(id: unknown): id is string {
	return isValidGamePackId(id);
}

export function gameVariantClass(id: string): string {
	return `brumes--variant-${id}`;
}

export function findGameVariant(
	registration: GameRegistration,
	id: unknown,
): GameVariant | null {
	for (const variant of registration.variants ?? []) {
		if (variant.id === id) {
			return variant;
		}
	}

	return null;
}

export function resolveGameVariant(
	registration: GameRegistration,
	id: unknown,
): GameVariant | null {
	const variants = registration.variants ?? [];
	if (variants.length === 0) {
		return null;
	}

	return (
		findGameVariant(registration, id) ??
		findGameVariant(registration, registration.defaultVariantId) ??
		variants[0]
	);
}

export function resolveGameAppearance(
	registration: GameRegistration,
	variantId: unknown,
	override: GameStyleOverride = {},
): ResolvedGameAppearance {
	const variant = resolveGameVariant(registration, variantId);
	const variantStyle = variant
		? mergeGameStyle(registration.pack.style, variant.style)
		: registration.pack.style;

	return {
		pack: registration.pack,
		variant,
		style: mergeGameStyle(variantStyle, override),
		polarities: variant?.polarities ?? registration.pack.polarities ?? [],
	};
}

const log = logScope("Games");
const unreadSections: string[] = [];

/**
 * The section tokens the game is held to under these polarities, the user's
 * file included. A second polarity makes `alternate` the other one: the layer
 * is then left unread and said so once, and the game stays loaded — a vault
 * that claims a polarity in its own file must not lose its game for it.
 */
export function publishedSection(
	packId: string,
	style: GameStyleValues,
	polarities: readonly GamePolarity[],
): GameStyleTokens | null {
	const declared = Object.keys(style.section?.note ?? {}).length > 0;

	if (declared && polarities.length > 1 && unreadSections.indexOf(packId) === -1) {
		unreadSections.push(packId);
		log.warn(
			`Ignoring the section layer of "${packId}": with more than one polarity, an alternate section is painted in the other one.`,
		);
	}

	return sectionTokens(style, polarities);
}

export function effectiveColourScheme<T extends "obsidian" | GamePolarity>(
	polarities: GamePolarity[],
	requested: T,
): T | GamePolarity {
	return polarities.length === 1 ? polarities[0] : requested;
}
