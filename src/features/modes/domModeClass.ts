import { BrumesMode } from "../../settings/types";

const WORKSPACE_THEME_CLASS = "brumes--workspace-theme";

const MODE_CLASSES = [
	"brumes--city-of-mist",
	"brumes--otherscape",
	"brumes--legend-in-the-mist",
];

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
	body.classList.add(`brumes--${mode}`);
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

/** Leave a document as the plugin found it. */
export function clearBrumesModeClasses(doc: Document) {
	const body = doc.body;

	for (const cls of MODE_CLASSES) {
		body.classList.remove(cls);
	}

	body.classList.remove(WORKSPACE_THEME_CLASS);
}
