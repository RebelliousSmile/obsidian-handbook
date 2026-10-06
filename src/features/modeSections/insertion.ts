import type { Editor, Menu } from "obsidian";
import { t } from "../../utils/i18n";
import { insertDirectivePair } from "../layoutRegions/insertion";
import { ModeSectionMode } from "./parser";

/**
 * Wraps a selection between the two source directives the parser reads, each
 * alone on its line with a blank line on each side (an HTML comment glued to a
 * paragraph would belong to it and never be seen).
 */
export function wrapInModeSection(
	selection: string,
	mode: ModeSectionMode,
): string {
	const body = selection.replace(/^\n+|\n+$/g, "");
	return [
		`<!-- handbook-mode: ${mode} -->`,
		"",
		body,
		"",
		"<!-- /handbook-mode -->",
	].join("\n");
}

/**
 * Always offered: whether the active game has two modes is reported when the
 * note is read, not hidden here. `dark` and `light` stay valid by hand.
 */
export function contributeModeSectionInsertion(
	menu: Menu,
	editor: Editor,
): number {
	menu.addItem((item) =>
		item
			.setTitle(t("Alternate section"))
			.setIcon("contrast")
			.onClick(() => insertModeSection(editor)),
	);

	return 1;
}

function insertModeSection(editor: Editor): void {
	insertDirectivePair(editor, wrapInModeSection(editor.getSelection(), "alternate"));
}
