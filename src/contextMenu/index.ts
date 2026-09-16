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
import { contributeRenderedTomlPaste } from "../features/blocks/pasteToml";
import {
	contributeTagInsertion,
	hasTagInsertion,
} from "../features/tags/contextMenu";
import {
	contributeCalloutInsertions,
	getAvailableCalloutInsertions,
} from "../features/callouts/contextMenu";
import { getOrCreateBrumesSubmenu } from "../utils/contextSubMenu";

export function registerBrumesContextMenu(plugin: BrumesPlugin): EventRef {
	return plugin.app.workspace.on(
		"editor-menu",
		(menu: Menu, editor: Editor) => {
			const hasAnyItems =
				hasTagInsertion() ||
				getAvailableCalloutInsertions(plugin.settings, plugin.settings.mode)
					.length > 0 ||
				hasBlockInsertions(plugin.settings);

			if (!hasAnyItems) {
				return;
			}

			const submenu = getOrCreateBrumesSubmenu(menu);
			let hasItems = false;

			const tagItems = contributeTagInsertion(submenu, editor);
			hasItems = tagItems > 0;

			if (
				getAvailableCalloutInsertions(plugin.settings, plugin.settings.mode)
					.length > 0 &&
				hasItems
			) {
				submenu.addSeparator();
			}
			const calloutItems = contributeCalloutInsertions(
				submenu,
				editor,
				plugin.settings,
				plugin.settings.mode,
			);
			hasItems = hasItems || calloutItems > 0;

			if (hasItems) {
				submenu.addSeparator();
			}
			const renderedPasteItems = contributeRenderedTomlPaste(submenu, plugin);
			hasItems = hasItems || renderedPasteItems;

			if (hasBlockInsertions(plugin.settings) && renderedPasteItems) {
				submenu.addSeparator();
			}
			const blockItems = contributeBlockInsertions(
				submenu,
				editor,
				plugin.settings,
			);
			hasItems = blockItems > 0 || hasItems;

			const hasTomlExport = hasTomlExportAtCursor(editor, plugin.settings);
			if (hasTomlExport) {
				if (hasItems) submenu.addSeparator();
				contributeTomlExports(submenu, editor, plugin.settings);
			}
		},
	);
}
