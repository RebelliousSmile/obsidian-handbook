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
	const menu = new Menu();
	addRollerAction(menu, plugin, data);
	menu.showAtMouseEvent(event);
}

type DiceRollerPlugin = DiceRollerApi;

function diceRoller(plugin: BrumesPlugin): DiceRollerPlugin | null {
	const app = plugin.app as unknown as { plugins?: { getPlugin?(id: string): unknown } };
	return (app.plugins?.getPlugin?.("obsidian-dice-roller") as DiceRollerPlugin | undefined) ?? null;
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
		await navigator.clipboard.writeText(result);
		new Notice("Roll result copied to clipboard.");
	} catch {
		new Notice("Could not roll or copy this table result.");
	}
}
