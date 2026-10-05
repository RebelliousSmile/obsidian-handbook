import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseRoller } from "../src/features/rollers/parser";
import { rollTable } from "../src/features/rollers/roll";
import { addRollerAction, contributeRollerToEventMenu, openRollerContextMenu, rollerStrings } from "../src/features/rollers/contextMenu";
import { readRollerCalloutTable } from "../src/features/rollers/callout";
import type { Menu } from "obsidian";

const ordinary = parseRoller(`| Result |
| --- |
| First |
| Second |`);
assert.ok(ordinary, "an ordinary roller table parses");
assert.equal(ordinary.table.lookupFormula, null);
assert.equal(ordinary.table.rows.length, 2);

const lookup = parseRoller(`| dice: 1d6 | Result |
| --- | --- |
| 1-3 | Low |
| 4–6 | High |`);
assert.ok(lookup, "a lookup roller table parses");
assert.equal(lookup.table.lookupFormula, "1d6");
assert.equal(await rollTable({
	getRoller: async () => ({ roll: async () => undefined, result: 5 }),
}, lookup), "High");

assert.equal(parseRoller("No table."), null, "a roller without a table is rejected");
assert.equal(parseRoller(`| A |
| --- |
| A |

| B |
| --- |
| B |`), null, "a roller with multiple tables is rejected");
assert.equal(await rollTable({
	getArrayRoller: async () => ({ roll: async () => undefined, results: ["Second"] }),
}, ordinary), "Second");

class FakeItem {
	title = "";
	action: (() => void) | null = null;
	setTitle(value: string) { this.title = value; return this; }
	setIcon(_value: string) { return this; }
	onClick(action: () => void) { this.action = action; return this; }
}

class FakeMenu {
	items: FakeItem[] = [];
	openedAt: MouseEvent | null = null;
	addItem(configure: (item: FakeItem) => unknown) {
		const item = new FakeItem();
		configure(item);
		this.items.push(item);
		return item;
	}
	showAtMouseEvent(event: MouseEvent) { this.openedAt = event; }
}

const tableOptions: string[][] = [];
const copied: string[] = [];
Object.defineProperty(globalThis, "navigator", {
	configurable: true,
	value: { clipboard: { writeText: async (value: string) => copied.push(value) } },
});
Object.defineProperty(globalThis, "activeDocument", {
	configurable: true,
	value: null,
});
Object.defineProperty(globalThis, "activeWindow", {
	configurable: true,
	writable: true,
	value: {},
});
const plugin = {
	app: { plugins: { getPlugin: () => ({
		getArrayRoller: async (options: string[]) => {
			tableOptions.push(options);
			return { roll: async () => undefined, results: [options[0]] };
		},
	}) } },
} as never;
const firstMenu = new FakeMenu();
const secondMenu = new FakeMenu();
assert.equal(addRollerAction(firstMenu as unknown as Menu, plugin, ordinary), true);
const other = parseRoller(`| Result |
| --- |
| Third |
| Fourth |`);
assert.ok(other);
assert.equal(addRollerAction(secondMenu as unknown as Menu, plugin, other), true);
firstMenu.items[0].action?.();
await new Promise<void>((resolve) => setImmediate(resolve));
secondMenu.items[0].action?.();
await new Promise<void>((resolve) => setImmediate(resolve));
assert.deepEqual(tableOptions, [["First", "Second"], ["Third", "Fourth"]], "each table-scoped action passes only its own rows to Dice Roller");
assert.deepEqual(copied, ["First", "Third"], "each table-scoped action copies its own result");
const fallbackCopied: string[] = [];
Object.defineProperty(globalThis, "navigator", {
	configurable: true,
	value: { clipboard: { writeText: async () => { throw new Error("clipboard permission denied"); } } },
});
Object.defineProperty(globalThis, "require", {
	configurable: true,
	value: (module: string) => module === "electron" ? { clipboard: { writeText: (value: string) => fallbackCopied.push(value) } } : undefined,
});
Object.defineProperty(globalThis, "activeDocument", {
	configurable: true,
	value: { defaultView: { require: (module: string) => module === "electron" ? { clipboard: { writeText: (value: string) => fallbackCopied.push(value) } } : undefined } },
});
const fallbackMenu = new FakeMenu();
assert.equal(addRollerAction(fallbackMenu as unknown as Menu, plugin, ordinary), true);
fallbackMenu.items[0].action?.();
await new Promise<void>((resolve) => setImmediate(resolve));
assert.deepEqual(fallbackCopied, ["First"], "the Electron clipboard fallback copies when the browser clipboard rejects the write");
const contextEvent = {
	prevented: false,
	stopped: false,
	immediatelyStopped: false,
	preventDefault() { this.prevented = true; },
	stopPropagation() { this.stopped = true; },
	stopImmediatePropagation() { this.immediatelyStopped = true; },
} as unknown as MouseEvent;
openRollerContextMenu(plugin, ordinary, contextEvent);
assert.equal((contextEvent as unknown as { prevented: boolean }).prevented, true, "the Roller menu suppresses the native context menu");
assert.equal((contextEvent as unknown as { stopped: boolean }).stopped, true, "the Roller menu stops Obsidian's reading-mode menu handler");
assert.equal((contextEvent as unknown as { immediatelyStopped: boolean }).immediatelyStopped, true, "the Roller menu stops competing handlers on the table");
const registrySource = readFileSync("src/features/blocks/registry.ts", "utf8");
const editorMenuSource = readFileSync("src/contextMenu/index.ts", "utf8");
const rollerJourneySource = readFileSync("tools/e2e/roller-cdp.py", "utf8");
assert.match(registrySource, /table\?\.addEventListener\("contextmenu"/, "rendered Roller tables bind their own context event");
assert.doesNotMatch(editorMenuSource, /contributeRollerAction/, "the editor-wide menu cannot reuse stale Roller state");
assert.match(rollerJourneySource, /== "preview"[\s\S]*toggle-preview[\s\S]*=== 'source'/, "the Roller journey forces a fresh reading-mode render");
assert.match(rollerJourneySource, /getMostRecentLeaf\(\)\?\.view\?\.containerEl/, "the Roller journey scopes tables to the active Markdown view");
assert.match(rollerJourneySource, /getBoundingClientRect\(\)[\s\S]*rect\.width > 0/, "the Roller journey selects only visible Roller tables");
assert.doesNotMatch(rollerJourneySource, /querySelectorAll\('\.brumes-roller--table'\)\.length === 2/, "the Roller journey does not treat retained global Roller nodes as authored tables");
assert.match(rollerJourneySource, /def instrument_dice_roller\(\):[\s\S]*__handbookRollerTrace/, "the Roller journey observes Dice Roller results in the plugin context");

const fakeRow = (selector: string, values: string[]) => ({
	querySelectorAll: (asked: string) => asked === selector ? values.map((textContent) => ({ textContent })) : [],
});
const fakeTable = (headers: string[], rows: string[][]) => ({
	querySelector: () => fakeRow("th", headers),
	querySelectorAll: () => rows.map((row) => fakeRow("td", row)),
}) as unknown as Element;
const calloutLookup = readRollerCalloutTable(fakeTable(["d10", "Événement"], [["1", "Voiture"], ["2-10", "Colonne"]]));
assert.ok(calloutLookup, "the table of a roller callout is read from its rendered cells");
assert.equal(calloutLookup.table.lookupFormula, "1d10", "a bare die header is the lookup formula");
assert.equal(await rollTable({ getRoller: async () => ({ roll: async () => undefined, result: 7 }) }, calloutLookup), "Colonne");
assert.equal(readRollerCalloutTable(fakeTable(["Résultat"], [["Un"], ["Deux"]]))?.table.lookupFormula, null, "a table without a die header rolls one row");
assert.equal(readRollerCalloutTable(fakeTable(["d6", "Résultat"], [])), null, "a roller callout without rows offers no roll");
assert.match(readFileSync("src/BrumesPlugin.ts", "utf8"), /bindRollerCallouts\(this, win\.doc\)/, "popout windows bind roller callouts too");

const hostEvent = {
	stopped: false,
	preventDefault() { /* Menu.forEvent owns the default action */ },
	stopPropagation() { this.stopped = true; },
	stopImmediatePropagation() { this.stopped = true; },
};
contributeRollerToEventMenu(plugin, calloutLookup, hostEvent as unknown as MouseEvent);
const { eventMenus } = await import("obsidian") as unknown as { eventMenus: Array<{ event: unknown; menu: { titles: string[] } }> };
assert.equal(eventMenus.length, 1, "a roller callout joins the menu of its event rather than opening its own");
assert.equal(eventMenus[0].event, hostEvent);
assert.deepEqual(eventMenus[0].menu.titles, ["Roll and copy result"]);
assert.equal(hostEvent.stopped, false, "the callout keeps its host menu: the event still reaches Obsidian");
assert.match(readFileSync("src/features/rollers/callout.ts", "utf8"), /contributeRollerToEventMenu\(plugin, data, event\)/, "roller callouts contribute to the event menu");

// Dice Roller 11 keeps only a deprecated array roller on the plugin object:
// a die formula is rolled through the API it publishes on the window.
const publishedFormulas: string[] = [];
const publishedCopies: string[] = [];
Object.defineProperty(globalThis, "navigator", {
	configurable: true,
	value: { clipboard: { writeText: async (value: string) => publishedCopies.push(value) } },
});
(globalThis as unknown as { activeWindow: unknown }).activeWindow = {
	DiceRoller: {
		getRoller: async (formula: string) => {
			publishedFormulas.push(formula);
			return { roll: async () => undefined, result: 7 };
		},
	},
};
const publishedMenu = new FakeMenu();
addRollerAction(publishedMenu as unknown as Menu, plugin, calloutLookup);
publishedMenu.items[0].action?.();
await new Promise<void>((resolve) => setImmediate(resolve));
assert.deepEqual(publishedFormulas, ["1d10"], "a die table rolls through the API Dice Roller publishes, not through the plugin object");
assert.deepEqual(publishedCopies, ["Colonne"], "a die table copies the one row its roll designates");
assert.equal(rollerStrings("fr").action, "Lancer et copier le résultat");
assert.equal(rollerStrings("fr-CA").action, "Lancer et copier le résultat");
assert.equal(rollerStrings("de").action, "Roll and copy result", "an untranslated language falls back to English");

console.log("Roller assertions passed.");
