import { BrumesMode } from "../../settings/types";

const WORKSPACE_THEME_CLASS = "brumes--workspace-theme";

const MODE_CLASSES = [
	"brumes--city-of-mist",
	"brumes--otherscape",
	"brumes--legend-in-the-mist",
];

export function setBrumesModeClass(mode: BrumesMode) {
	const body = activeDocument.body;

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
export function setBrumesWorkspaceThemeClass(enabled: boolean) {
	const body = activeDocument.body;

	if (enabled) {
		body.classList.add(WORKSPACE_THEME_CLASS);
		return;
	}

	body.classList.remove(WORKSPACE_THEME_CLASS);
}
