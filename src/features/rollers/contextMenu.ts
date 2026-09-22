import { Menu, Notice } from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";
import type { RollerData } from "./parser";
import { rollTable, type DiceRollerApi } from "./roll";

interface RollerContext { data: RollerData; rememberedAt: number; }
const contexts = new WeakMap<BrumesPlugin, RollerContext>();
const LIFETIME = 30_000;

export function rememberRollerContext(plugin: BrumesPlugin, data: RollerData): void {
	contexts.set(plugin, { data, rememberedAt: Date.now() });
}

export function contributeRollerAction(menu: Menu, plugin: BrumesPlugin): boolean {
	const context = contexts.get(plugin);
	if (!context || Date.now() - context.rememberedAt > LIFETIME) return false;
	menu.addItem((item) => item.setTitle("Roll and copy result").setIcon("clipboard").onClick(() => {
		void rollAndCopy(plugin, context.data);
	}));
	return true;
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
