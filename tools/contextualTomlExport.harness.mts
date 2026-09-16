import assert from "node:assert/strict";
import type { Editor, Menu } from "obsidian";
import {
	contributeTomlExports,
	hasTomlExportAtCursor,
} from "../src/features/blocks/tomlExports";
import { normalizeSettings } from "../src/settings/types";

class FakeEditor {
	constructor(private readonly source: string, private readonly line: number) {}

	getCursor() { return { line: this.line, ch: 0 }; }
	getValue() { return this.source; }
}

class FakeItem {
	title = "";
	icon = "";
	action: (() => void) | undefined;

	setTitle(title: string) { this.title = title; return this; }
	setIcon(icon: string) { this.icon = icon; return this; }
	onClick(action: () => void) { this.action = action; return this; }
}

class FakeMenu {
	items: FakeItem[] = [];

	addItem(configure: (item: FakeItem) => unknown) {
		const item = new FakeItem();
		configure(item);
		this.items.push(item);
		return item;
	}
}

const settings = normalizeSettings(undefined);
settings.mode = "legend-in-the-mist";
const source = [
	"```theme-card",
	"origin",
	"circumstance",
	"{Born in the marsh}",
	"{Track by moonlight}",
	"{Know every hidden trail}",
	"{!Trust strangers too easily}",
	"```",
].join("\n");
const editor = new FakeEditor(source, 3) as unknown as Editor;
const copied: string[] = [];

Object.defineProperty(globalThis, "navigator", {
	configurable: true,
	value: { clipboard: { writeText: async (text: string) => copied.push(text) } },
});

assert.equal(hasTomlExportAtCursor(editor, settings), true);
const menu = new FakeMenu();
assert.equal(contributeTomlExports(menu as unknown as Menu, editor, settings), 1);
assert.equal(menu.items.length, 1);
assert.equal(menu.items[0].title, "Copy theme card as TOML");
assert.equal(menu.items[0].icon, "copy");
menu.items[0].action?.();
assert.match(copied[0], /^title_tag = "Born in the marsh"/);

const outside = new FakeEditor("plain text", 0) as unknown as Editor;
assert.equal(hasTomlExportAtCursor(outside, settings), false);
assert.equal(contributeTomlExports(new FakeMenu() as unknown as Menu, outside, settings), 0);
