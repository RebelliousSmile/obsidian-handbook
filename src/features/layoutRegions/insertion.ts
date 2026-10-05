import type { Editor, Menu } from "obsidian";

const DEFAULT_COLUMNS = 2;

/**
 * Wraps a selection between the two source directives the parser reads. Both
 * markers stand alone on their line, with a blank line on each side: an HTML
 * comment glued to a paragraph would belong to it and never be seen.
 */
export function wrapInLayoutRegion(
	selection: string,
	columns: number = DEFAULT_COLUMNS,
): string {
	const body = selection.replace(/^\n+|\n+$/g, "");
	return [
		`<!-- handbook-layout: columns=${columns} -->`,
		"",
		body,
		"",
		"<!-- /handbook-layout -->",
	].join("\n");
}

export function contributeLayoutRegionInsertion(
	menu: Menu,
	editor: Editor,
): number {
	menu.addItem((item) =>
		item
			.setTitle("Multi-column region")
			.setIcon("columns-2")
			.onClick(() => insertLayoutRegion(editor)),
	);

	return 1;
}

function insertLayoutRegion(editor: Editor): void {
	const from = editor.getCursor("from");
	const to = editor.getCursor("to");
	const region = wrapInLayoutRegion(editor.getSelection());
	// The markers must start a line of their own, whatever surrounds the cursor.
	const before = from.ch === 0 ? "" : "\n\n";
	const after = to.ch === editor.getLine(to.line).length ? "" : "\n\n";

	editor.replaceRange(`${before}${region}${after}`, from, to);
	// Leave the cursor on the body, between the two markers.
	editor.setCursor({ line: from.line + (before === "" ? 2 : 4), ch: 0 });
}
