import { getLanguage, Menu, Notice } from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";
import type { RollerData } from "./parser";
import { t } from "../../utils/i18n";
import { rollTable, type DiceRollerApi } from "./roll";

export interface RollerStrings {
	action: string;
	missingDiceRoller: string;
	copied: string;
	failed: string;
}

/** The roller's visible strings in the interface language (`language`); English when untranslated. */
export function rollerStrings(language: string): RollerStrings {
	return {
		action: t("Roll and copy result", {}, language),
		missingDiceRoller: t("Dice roller must be enabled to roll this table.", {}, language),
		copied: t("Roll result copied to clipboard.", {}, language),
		failed: t("Could not roll or copy this table result.", {}, language),
	};
}

export function addRollerAction(menu: Menu, plugin: BrumesPlugin, data: RollerData): boolean {
	menu.addItem((item) => item.setTitle(rollerStrings(getLanguage()).action).setIcon("clipboard").onClick(() => {
		void rollAndCopy(plugin, data);
	}));
	return true;
}

/** Open a context menu bound to one rendered table rather than editor-global state. */
export function openRollerContextMenu(plugin: BrumesPlugin, data: RollerData, event: MouseEvent): void {
	event.preventDefault();
	event.stopPropagation();
	event.stopImmediatePropagation();
	const menu = new Menu();
	addRollerAction(menu, plugin, data);
	menu.showAtMouseEvent(event);
}

/**
 * Add the roll action to the menu Obsidian builds for this event, so a host
 * menu (the callout's own, in live preview) keeps its items.
 */
export function contributeRollerToEventMenu(plugin: BrumesPlugin, data: RollerData, event: MouseEvent): void {
	addRollerAction(Menu.forEvent(event), plugin, data);
}

type DiceRollerPlugin = DiceRollerApi;
type ElectronClipboard = { writeText(value: string): void };

/**
 * Dice Roller publishes its API on `window.DiceRoller` and on the plugin's
 * `api`; the plugin object itself only keeps a deprecated array roller, so a
 * die formula cannot be rolled through it.
 */
function diceRoller(plugin: BrumesPlugin): DiceRollerPlugin | null {
	const app = plugin.app as unknown as { plugins?: { getPlugin?(id: string): unknown } };
	const installed = app.plugins?.getPlugin?.("obsidian-dice-roller") as (DiceRollerPlugin & { api?: DiceRollerPlugin }) | null | undefined;
	if (!installed) return null;
	const published = (activeWindow as unknown as { DiceRoller?: DiceRollerPlugin }).DiceRoller;
	return published ?? installed.api ?? installed;
}

async function copyResult(value: string): Promise<void> {
	try {
		await navigator.clipboard.writeText(value);
		return;
	} catch {
		const runtime = activeDocument.defaultView as (Window & { require?: (module: string) => unknown }) | null;
		const electron = runtime?.require?.("electron") as { clipboard?: ElectronClipboard } | undefined;
		if (!electron?.clipboard) throw new Error("Clipboard unavailable");
		electron.clipboard.writeText(value);
	}
}

async function rollAndCopy(plugin: BrumesPlugin, data: RollerData): Promise<void> {
	const strings = rollerStrings(getLanguage());
	const dice = diceRoller(plugin);
	if (!dice || (data.table.lookupFormula === null ? !dice.getArrayRoller : !dice.getRoller)) {
		new Notice(strings.missingDiceRoller);
		return;
	}
	try {
		const result = await rollTable(dice, data);
		if (!result) throw new Error("empty result");
		await copyResult(result);
		new Notice(strings.copied);
	} catch {
		new Notice(strings.failed);
	}
}
