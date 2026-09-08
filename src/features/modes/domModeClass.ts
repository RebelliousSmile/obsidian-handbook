import { missingAssetClass } from "../../games/assets";
import { gamePackClass, gamePackClasses } from "../../games/registry";
import { BrumesMode } from "../../settings/types";

const WORKSPACE_THEME_CLASS = "brumes--workspace-theme";
const MISSING_ASSET_PREFIX = missingAssetClass("");

/** One class per declared pack, so a new game needs no edit here. */
const MODE_CLASSES = gamePackClasses();

/**
 * Every function here takes the document to act on. Obsidian opens detached
 * windows with a document of their own, and the mode class has to reach each
 * of them: the style the plugin writes is scoped by that class, so a body
 * without it stays undressed.
 */
export function setBrumesModeClass(mode: BrumesMode, doc: Document) {
	const body = doc.body;

	// Remove existing mode classes
	for (const cls of MODE_CLASSES) {
		body.classList.remove(cls);
	}

	// Add the new class
	body.classList.add(gamePackClass(mode));
}

/**
 * Repainting the whole workspace in the colours of the game is a choice of
 * its own: the mode styles the notes, this class styles everything around
 * them.
 */
export function setBrumesWorkspaceThemeClass(enabled: boolean, doc: Document) {
	const body = doc.body;

	if (enabled) {
		body.classList.add(WORKSPACE_THEME_CLASS);
		return;
	}

	body.classList.remove(WORKSPACE_THEME_CLASS);
}

/**
 * Say which illustrations the vault does not have, so the fallback rules can
 * key off a class rather than guess from a missing value. Dropping an image
 * is rarely enough on its own: a card without its frame needs a flat ground
 * and a border to still read as a card.
 */
export function setBrumesMissingAssetClasses(roles: string[], doc: Document) {
	const body = doc.body;
	const stale: string[] = [];

	for (let index = 0; index < body.classList.length; index++) {
		const cls = body.classList.item(index);
		if (cls && cls.indexOf(MISSING_ASSET_PREFIX) === 0) {
			stale.push(cls);
		}
	}

	for (const cls of stale) {
		body.classList.remove(cls);
	}

	for (const role of roles) {
		body.classList.add(missingAssetClass(role));
	}
}

/** Leave a document as the plugin found it. */
export function clearBrumesModeClasses(doc: Document) {
	const body = doc.body;

	for (const cls of MODE_CLASSES) {
		body.classList.remove(cls);
	}

	body.classList.remove(WORKSPACE_THEME_CLASS);
	setBrumesMissingAssetClasses([], doc);
}
