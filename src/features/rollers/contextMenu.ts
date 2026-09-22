import { Menu, Notice } from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";
import type { RollerData } from "./parser";
import { rollTable, type DiceRollerApi } from "./roll";

export function addRollerAction(menu: Menu, plugin: BrumesPlugin, data: RollerData): boolean {
	menu.addItem((item) => item.setTitle("Roll and copy result").setIcon("clipboard").onClick(() => {
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

type DiceRollerPlugin = DiceRollerApi;
type ElectronClipboard = { writeText(value: string): void };
type ElectronRuntime = { require?(module: string): unknown };

function diceRoller(plugin: BrumesPlugin): DiceRollerPlugin | null {
	const app = plugin.app as unknown as { plugins?: { getPlugin?(id: string): unknown } };
	return (app.plugins?.getPlugin?.("obsidian-dice-roller") as DiceRollerPlugin | undefined) ?? null;
}

async function copyResult(value: string): Promise<void> {
	// eslint-disable-next-line obsidianmd/prefer-active-doc -- Electron exposes its Node bridge on the plugin global, not the document window.
	const runtime = globalThis as ElectronRuntime;
	const electron = runtime?.require?.("electron") as { clipboard?: ElectronClipboard } | undefined;
	if (electron?.clipboard) {
		electron.clipboard.writeText(value);
		return;
	}

	try {
		await navigator.clipboard.writeText(value);
	} catch { throw new Error("Clipboard unavailable"); }
}

async function rollAndCopy(plugin: BrumesPlugin, data: RollerData): Promise<void> {
	const dice = diceRoller(plugin);
	if (!dice || (data.table.lookupFormula === null ? !dice.getArrayRoller : !dice.getRoller)) {
		new Notice("Dice roller must be enabled to roll this table.");
		return;
	}
	try {
		const result = await rollTable(dice, data);
		if (!result) throw new Error("empty result");
		await copyResult(result);
		new Notice("Roll result copied to clipboard.");
	} catch {
		new Notice("Could not roll or copy this table result.");
	}
}
