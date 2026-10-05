import { Editor, EditorChange, Menu, Notice } from "obsidian";
import { t } from "../../utils/i18n";
import { addSubmenu } from "../../utils/contextSubMenu";
import { findCalloutOpening, retargetCallouts, setCalloutType } from "./retarget";
import { BrumesSettings } from "../../settings/types";
import { CalloutDefinition } from "./types";
import { isCalloutAvailable } from "./types";
import { findGameRegistration } from "../../games/registry";

export interface CalloutInsertion {
	title: string;
	icon: string;
	alias: string;
	template: CalloutDefinition["template"];
}

/** Callouts visible from `activePackId`: scope "all", or that same pack — same filter as `buildAliasMap`. */
function availableCallouts(
	settings: BrumesSettings,
	activePackId: string,
): Array<{ entry: CalloutDefinition; alias: string }> {
	const required = findGameRegistration(activePackId)?.installation?.requires ?? [];
	const available: Array<{ entry: CalloutDefinition; alias: string }> = [];
	for (const entry of settings.callouts) {
		const alias = entry.aliases[0];
		if (alias && isCalloutAvailable(entry, activePackId, required)) available.push({ entry, alias });
	}
	return available;
}

export function getAvailableCalloutInsertions(
	settings: BrumesSettings,
	activePackId: string,
): CalloutInsertion[] {
	return availableCallouts(settings, activePackId).map(({ entry, alias }) => ({
		title: `${t("{name} callout", { name: entry.name })}${entry.native && alias !== entry.id ? ` (${alias})` : ""}`,
		icon: entry.icon ?? "message-square",
		alias,
		template: entry.template,
	}));
}

export function contributeCalloutInsertions(
	menu: Menu,
	editor: Editor,
	callouts: readonly CalloutInsertion[],
): number {
	if (callouts.length === 0) return 0;

	const submenu = addSubmenu(menu, t("Insert callout"), "message-square");
	for (const callout of callouts) {
		submenu.addItem((item) =>
			item
				.setTitle(callout.title)
				.setIcon(callout.icon)
				.onClick(() => insertCallout(editor, callout.alias, callout.template)),
		);
	}

	return callouts.length;
}

/** Shared with `commands.ts`, so a keyboard shortcut inserts the same shape as the context menu. */
export function insertCallout(
	editor: Editor,
	alias: string,
	template: CalloutDefinition["template"],
) {
	const cursor = editor.getCursor();

	if (template === "title-body") {
		const title = t("Title of the note");
		const line1 = `> [!${alias.toUpperCase()}] ${title}`;
		const line2 = `> ${t("Content of the note")}`;
		editor.replaceRange(`${line1}\n${line2}`, cursor);

		const line = cursor.line;
		const startCh = line1.indexOf(title);
		const endCh = startCh + title.length;
		editor.setSelection({ line, ch: startCh }, { line, ch: endCh });
		return;
	}

	const body = t("Text to read aloud");
	const line1 = `> [!${alias.toUpperCase()}]`;
	const line2 = `> ${body}`;
	editor.replaceRange(`${line1}\n${line2}`, cursor);

	const line = cursor.line + 1;
	const startCh = line2.indexOf(body);
	const endCh = startCh + body.length;
	editor.setSelection({ line, ch: startCh }, { line, ch: endCh });
}

/** Every alias the game declares, and the one of its first callout. */
export function getDeclaredCalloutAliases(
	settings: BrumesSettings,
	activePackId: string,
): { declared: Set<string>; first: string | null } {
	const declared = new Set<string>();
	let first: string | null = null;
	for (const { entry, alias } of availableCallouts(settings, activePackId)) {
		first = first ?? alias;
		for (const name of entry.aliases) declared.add(name.toLowerCase());
	}
	return { declared, first };
}

/** Obsidian's own type menu lists every built-in type: this one lists the game's. */
export function contributeCalloutTypeChange(
	menu: Menu,
	editor: Editor,
	callouts: readonly CalloutInsertion[],
): number {
	if (callouts.length === 0) return 0;
	const opening = findCalloutOpening((index) => editor.getLine(index), editor.getCursor().line);
	if (opening === null) return 0;

	const submenu = addSubmenu(menu, t("Change callout type"), "replace");
	for (const callout of callouts) {
		submenu.addItem((item) =>
			item
				.setTitle(callout.title)
				.setIcon(callout.icon)
				.onClick(() => {
					const text = editor.getLine(opening);
					editor.setLine(opening, setCalloutType(text, callout.alias));
				}),
		);
	}
	return callouts.length;
}

/** Callouts the game does not declare fall back to its first one. Returns how many changed. */
export function cleanUndeclaredCallouts(
	editor: Editor,
	settings: BrumesSettings,
	activePackId: string,
): number {
	const { declared, first } = getDeclaredCalloutAliases(settings, activePackId);
	if (first === null) return 0;
	const lines = editor.getValue().split("\n");
	const result = retargetCallouts(lines, declared, first);
	if (result.changed === 0) return 0;
	// One change per rewritten line: scroll, folds and the cursor stay where they are.
	const changes: EditorChange[] = [];
	result.lines.forEach((text, line) => {
		if (text !== lines[line]) {
			changes.push({ from: { line, ch: 0 }, to: { line, ch: lines[line].length }, text });
		}
	});
	editor.transaction({ changes });
	return result.changed;
}

/** The cleanup, then a notice that says what it did. Shared by the command and the menu. */
export function cleanUndeclaredCalloutsWithNotice(
	editor: Editor,
	settings: BrumesSettings,
	activePackId: string,
): void {
	const changed = cleanUndeclaredCallouts(editor, settings, activePackId);
	new Notice(changed === 0
		? t("Every callout is declared by the game.")
		: t("{count} callout(s) moved to the game's first callout.", { count: changed }));
}

/** Always offered: the note may hold callouts of another game anywhere, not only at the cursor. */
export function contributeCalloutCleanup(
	menu: Menu,
	editor: Editor,
	settings: BrumesSettings,
	activePackId: string,
): number {
	if (getDeclaredCalloutAliases(settings, activePackId).first === null) return 0;
	menu.addItem((item) =>
		item
			.setTitle(t("Clean up callouts the game does not declare"))
			.setIcon("eraser")
			.onClick(() => cleanUndeclaredCalloutsWithNotice(editor, settings, activePackId)),
	);
	return 1;
}
