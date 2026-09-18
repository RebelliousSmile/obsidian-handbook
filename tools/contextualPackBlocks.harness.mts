import assert from "node:assert/strict";
import type { Editor, Menu } from "obsidian";
import { contributeBlockInsertions } from "../src/features/blocks/registry";
import { contributeTomlExports } from "../src/features/blocks/tomlExports";
import { initGameRegistry } from "../src/games/registry";
import type { InstalledGamePlugin } from "../src/games/pluginManifest";
import { normalizeSettings } from "../src/settings/types";

class FakeEditor {
	inserted = "";

	constructor(private readonly source = "") {}

	getCursor() { return { line: 1, ch: 0 }; }
	getValue() { return this.source; }
	replaceRange(value: string) { this.inserted = value; }
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

const style = { base: { note: {}, workspace: {} }, light: { note: {}, workspace: {} }, dark: { note: {}, workspace: {} } };
const all = ["block:adrenaline-pj", "block:adrenaline-pnj", "block:adrenaline-monstre"];

function install(requires: string[]): void {
	initGameRegistry([{
		pack: { id: "adrenaline", label: "Adrenaline", style },
		installation: { root: "packs/adrenaline", version: "0.3.0", minimumHandbookVersion: "2.7.0", requires, variants: [] },
	} as unknown as InstalledGamePlugin]);
}

install(all);
const settings = normalizeSettings({ mode: "adrenaline" });
const fullMenu = new FakeMenu();
const fullEditor = new FakeEditor();
assert.equal(contributeBlockInsertions(fullMenu as unknown as Menu, fullEditor as unknown as Editor, settings), 3);
assert.deepEqual(fullMenu.items.map((item) => item.title), ["Fiche PJ Adrenaline", "Fiche PNJ Adrenaline", "Fiche monstre Adrenaline"]);
assert.deepEqual(fullMenu.items.map((item) => item.icon), ["user-round", "contact-round", "skull"]);
fullMenu.items[0].action?.();
assert.match(fullEditor.inserted, /^```adrenaline-pj/m);

const pjSource = fullEditor.inserted;
assert.equal(contributeTomlExports(new FakeMenu() as unknown as Menu, new FakeEditor(pjSource) as unknown as Editor, settings), 1);

install(all.filter((capability) => capability !== "block:adrenaline-pnj"));
const partialSettings = normalizeSettings({ mode: "adrenaline" });
const partialMenu = new FakeMenu();
assert.equal(contributeBlockInsertions(partialMenu as unknown as Menu, new FakeEditor() as unknown as Editor, partialSettings), 2);
assert.deepEqual(partialMenu.items.map((item) => item.title), ["Fiche PJ Adrenaline", "Fiche monstre Adrenaline"]);

const pnjSource = "```adrenaline-pnj\nnom = \"Absent\"\n```";
assert.equal(contributeTomlExports(new FakeMenu() as unknown as Menu, new FakeEditor(pnjSource) as unknown as Editor, partialSettings), 0);

initGameRegistry([]);
