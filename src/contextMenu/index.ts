import { Editor, EventRef, Menu } from "obsidian";
import type BrumesPlugin from "../BrumesPlugin";
import {
	contributeBlockInsertions,
	hasBlockInsertions,
} from "../features/blocks/registry";
import {
	contributeTomlExports,
	hasTomlExportAtCursor,
} from "../features/blocks/tomlExports";
import { contributeRenderedTomlPaste, hasRenderedTomlPaste } from "../features/blocks/pasteToml";
import {
	contributeTagInsertion,
	hasTagInsertion,
} from "../features/tags/contextMenu";
import {
	contributeCalloutCleanup,
	contributeCalloutInsertions,
	contributeCalloutTypeChange,
	getAvailableCalloutInsertions,
} from "../features/callouts/contextMenu";
import { contributeLayoutRegionInsertion } from "../features/layoutRegions/insertion";
import { contributeModeSectionInsertion } from "../features/modeSections/insertion";
import { addSubmenu, getOrCreateBrumesSubmenu } from "../utils/contextSubMenu";

export function registerBrumesContextMenu(plugin: BrumesPlugin): EventRef {
	return plugin.app.workspace.on(
		"editor-menu",
		(menu: Menu, editor: Editor) => {
			const callouts = getAvailableCalloutInsertions(plugin.settings, plugin.settings.mode);
			const hasAnyItems =
				hasTagInsertion() ||
				callouts.length > 0 ||
				hasBlockInsertions(plugin.settings);

			if (!hasAnyItems) {
				return;
			}

			const submenu = getOrCreateBrumesSubmenu(menu);
			let hasItems = false;

			const tagItems = contributeTagInsertion(submenu, editor);
			hasItems = tagItems > 0;

			if (callouts.length > 0 && hasItems) {
				submenu.addSeparator();
			}
			const calloutItems = contributeCalloutInsertions(submenu, editor, callouts);
			hasItems = hasItems || calloutItems > 0;
			contributeCalloutTypeChange(submenu, editor, callouts);
			contributeCalloutCleanup(submenu, editor, plugin.settings, plugin.settings.mode);

			if (hasItems) {
				submenu.addSeparator();
			}
			const blockItems = contributeBlockInsertions(
				submenu,
				editor,
				plugin.settings,
			);
			hasItems = blockItems > 0 || hasItems;

			if (hasItems) submenu.addSeparator();
			contributeLayoutRegionInsertion(submenu, editor);
			contributeModeSectionInsertion(submenu, editor);

			// Paste and copy share one entry, so the menu keeps a single line for TOML.
			const hasTomlExport = hasTomlExportAtCursor(editor, plugin.settings);
			if (hasTomlExport || hasRenderedTomlPaste(plugin)) {
				submenu.addSeparator();
				const tomlMenu = addSubmenu(submenu, "TOML", "file-code");
				contributeRenderedTomlPaste(tomlMenu, plugin);
				if (hasTomlExport) contributeTomlExports(tomlMenu, editor, plugin.settings);
			}
		},
	);
}
