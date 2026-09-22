import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseRoller } from "../src/features/rollers/parser";
import { rollTable } from "../src/features/rollers/roll";
import { addRollerAction, openRollerContextMenu } from "../src/features/rollers/contextMenu";
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

console.log("Roller assertions passed.");
