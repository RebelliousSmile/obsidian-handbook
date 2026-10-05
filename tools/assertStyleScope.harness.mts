import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type BrumesPlugin from "../src/BrumesPlugin";
import { loadBrumesBlocks } from "../src/features/blocks/registry";
import {
	clearBrumesModeClasses,
	setBrumesColourSchemeClass,
} from "../src/features/modes/domModeClass";
import {
	buildGameStyle,
	GameStyleWriter,
} from "../src/features/modes/styleElement";
import { readPackTokens } from "../src/games/fromSchema";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings/types";

const MODE_CLASS = "brumes--legend-in-the-mist";
const BLOCK_SCOPE_CLASS = "brumes-block-scope";

const css = buildGameStyle(
	"legend-in-the-mist",
	{
		base: {
			note: { "--test-note-base": "note-base" },
			workspace: { "--test-workspace-base": "workspace-base" },
		},
		light: {
			note: { "--test-note-light": "note-light" },
			workspace: { "--test-workspace-light": "workspace-light" },
		},
		dark: { note: {}, workspace: {} },
	},
	false,
	["light"],
);

assert.match(css, /--test-note-base: note-base/);
assert.match(css, /--test-note-light: note-light/);
assert.doesNotMatch(css, /--test-workspace-/);
assert.match(css, /\.workspace-leaf-content\[data-type="markdown"\]/);
assert.match(css, /\.markdown-source-view/);
assert.match(css, /\.markdown-reading-view/);
assert.match(css, /\.brumes-block-scope\.brumes--legend-in-the-mist/);
assert.doesNotMatch(
	css,
	/body\.brumes--legend-in-the-mist\s*\{[^}]*--test-note-/,
);

const workspaceCss = buildGameStyle(
	"legend-in-the-mist",
	{
		base: {
			note: { "--test-note-base": "note-base" },
			workspace: { "--test-workspace-base": "workspace-base" },
		},
		light: {
			note: { "--test-note-light": "note-light" },
			workspace: { "--test-workspace-light": "workspace-light" },
		},
		dark: { note: {}, workspace: {} },
	},
	true,
	["light"],
);

assert.match(
	workspaceCss,
	/body\.brumes--legend-in-the-mist\.brumes--workspace-theme\s*\{[^}]*--test-workspace-base: workspace-base/,
);

const forcedDarkCss = buildGameStyle(
	"legend-in-the-mist",
	{
		base: { note: {}, workspace: {} },
		light: {
			note: { "--forced-light": "light" },
			workspace: {},
		},
		dark: {
			note: { "--forced-dark": "dark" },
			workspace: {},
		},
	},
	false,
	["light", "dark"],
	"dark",
);

assert.match(forcedDarkCss, /\.brumes--colour-dark/);
assert.match(forcedDarkCss, /--forced-dark: dark/);
assert.doesNotMatch(forcedDarkCss, /\.theme-dark/);

// Paper is light: a dark layer is written for the screen only, and print gets
// the light layer on the bare mode selector, whatever class the body carries.
function splitMedia(sheet: string, query: string): { inside: string; outside: string } {
	const opening = `@media ${query} {`;
	let inside = "";
	let outside = "";
	let cursor = 0;
	for (;;) {
		const start = sheet.indexOf(opening, cursor);
		if (start === -1) break;
		let depth = 1;
		let end = start + opening.length;
		while (depth > 0 && end < sheet.length) {
			if (sheet[end] === "{") depth += 1;
			if (sheet[end] === "}") depth -= 1;
			end += 1;
		}
		assert.equal(depth, 0, `unbalanced @media ${query} block`);
		outside += sheet.slice(cursor, start);
		inside += sheet.slice(start, end);
		cursor = end;
	}
	return { inside, outside: outside + sheet.slice(cursor) };
}
function printBlocks(sheet: string): string {
	return splitMedia(sheet, "print").inside;
}
function outsideScreen(sheet: string): string {
	return splitMedia(sheet, "screen").outside;
}
assert.doesNotMatch(outsideScreen(forcedDarkCss), /--forced-dark/, "a forced dark layer reaches print");
assert.match(printBlocks(forcedDarkCss), /--forced-light: light/);
assert.match(printBlocks(forcedDarkCss), /body\.brumes--legend-in-the-mist \.print \.markdown-preview-view/);
assert.doesNotMatch(printBlocks(forcedDarkCss), /brumes--colour-|theme-(dark|light)/);

const themedCss = buildGameStyle(
	"legend-in-the-mist",
	{
		base: { note: {}, workspace: {} },
		light: { note: { "--forced-light": "light" }, workspace: {} },
		dark: { note: { "--forced-dark": "dark" }, workspace: {} },
	},
	false,
	["light", "dark"],
);
assert.match(themedCss, /@media screen \{\nbody\.brumes--legend-in-the-mist\.theme-dark /);
assert.doesNotMatch(outsideScreen(themedCss), /--forced-dark/, "the dark layer of the vault theme reaches print");
assert.match(printBlocks(themedCss), /--forced-light: light/);

const darkOnlyCss = buildGameStyle(
	"legend-in-the-mist",
	{
		base: { note: { "--only-base": "base" }, workspace: {} },
		light: { note: {}, workspace: {} },
		dark: { note: { "--only-dark": "dark" }, workspace: {} },
	},
	false,
	["dark"],
);
assert.match(outsideScreen(darkOnlyCss), /--only-base: base/);
assert.doesNotMatch(outsideScreen(darkOnlyCss), /--only-dark/, "a dark-only pack prints its dark layer");
assert.equal(printBlocks(darkOnlyCss), "");

const workspaceDarkCss = buildGameStyle(
	"legend-in-the-mist",
	{
		base: { note: {}, workspace: {} },
		light: { note: { "--forced-light": "light" }, workspace: { "--chrome-light": "light" } },
		dark: { note: { "--forced-dark": "dark" }, workspace: { "--chrome-dark": "dark" } },
	},
	true,
	["light", "dark"],
	"dark",
);
assert.doesNotMatch(outsideScreen(workspaceDarkCss), /--(forced|chrome)-dark/, "a dark workspace layer reaches print");
assert.match(printBlocks(workspaceDarkCss), /body\.brumes--legend-in-the-mist\.brumes--workspace-theme \{\n\t--chrome-light: light;/);

const printScss = readFileSync("src/styles/_print.scss", "utf8");
assert.match(printScss, /@media print[\s\S]*\.print \.markdown-preview-view \{[^}]*background-color: #fff !important;[^}]*background-image: none !important;/);
assert.match(printScss, /--background-primary: #fff !important;/);

// The colour-scheme class Handbook forces is not one Obsidian knows to swap
// before printing: it gives way while a `.print` container sits in the body.
class PaperClassList {
	private names: string[] = [];
	get length(): number {
		return this.names.length;
	}
	item(index: number): string | null {
		return this.names[index] ?? null;
	}
	add(...names: string[]): void {
		for (const name of names) if (!this.names.includes(name)) this.names.push(name);
	}
	remove(...names: string[]): void {
		this.names = this.names.filter((name) => !names.includes(name));
	}
	contains(name: string): boolean {
		return this.names.includes(name);
	}
}
const paperObservers: { notify: () => void; connected: boolean }[] = [];
(globalThis as { MutationObserver?: unknown }).MutationObserver = class {
	private readonly entry: { notify: () => void; connected: boolean };
	constructor(notify: () => void) {
		this.entry = { notify, connected: false };
		paperObservers.push(this.entry);
	}
	observe(): void {
		this.entry.connected = true;
	}
	disconnect(): void {
		this.entry.connected = false;
	}
};
const paperBody = { classList: new PaperClassList(), children: [] as { classList: PaperClassList }[] };
const paperDocument = { body: paperBody } as unknown as Document;
const printContainer = { classList: new PaperClassList() };
printContainer.classList.add("print");

setBrumesColourSchemeClass("dark", paperDocument);
assert.equal(paperBody.classList.contains("brumes--colour-dark"), true);
paperBody.children.push(printContainer);
paperObservers[0].notify();
assert.equal(paperBody.classList.contains("brumes--colour-dark"), false, "a forced dark scheme is printed");
assert.equal(paperBody.classList.contains("brumes--colour-light"), true);
setBrumesColourSchemeClass("dark", paperDocument);
assert.equal(paperBody.classList.contains("brumes--colour-dark"), false, "dressing again while printing brings dark back");
assert.equal(paperObservers.length, 1, "one observer per document");
paperBody.children.length = 0;
paperObservers[0].notify();
assert.equal(paperBody.classList.contains("brumes--colour-dark"), true, "the screen does not get its dark scheme back");
assert.equal(paperBody.classList.contains("brumes--colour-light"), false);
clearBrumesModeClasses(paperDocument);
assert.equal(paperObservers[0].connected, false);
assert.equal(paperBody.classList.length, 0);
delete (globalThis as { MutationObserver?: unknown }).MutationObserver;

interface StyleHead {
	appendChild(element: StyleElement): StyleElement;
	insertBefore(element: StyleElement, reference: StyleElement | null): StyleElement;
	removeChild(element: StyleElement): StyleElement;
}

class StyleElement {
	id = "";
	textContent = "";
	parentNode: StyleHead | null = null;
	remove(): void {
		this.parentNode?.removeChild(this);
	}
}

(globalThis as { HTMLStyleElement?: unknown }).HTMLStyleElement = StyleElement;
function createStyleDocument() {
	const elements = new Map<string, StyleElement>();
	const order: string[] = [];
	const head: StyleHead = {
		appendChild: (element) => {
			element.parentNode?.removeChild(element);
			element.parentNode = head;
			elements.set(element.id, element);
			order.push(element.id);
			return element;
		},
		insertBefore: (element, reference) => {
			if (!reference) return head.appendChild(element);
			element.parentNode?.removeChild(element);
			element.parentNode = head;
			elements.set(element.id, element);
			const index = order.indexOf(reference.id);
			if (index === -1) order.push(element.id);
			else order.splice(index, 0, element.id);
			return element;
		},
		removeChild: (element) => {
			elements.delete(element.id);
			const index = order.indexOf(element.id);
			if (index !== -1) order.splice(index, 1);
			element.parentNode = null;
			return element;
		},
	};
	return {
		document: {
			getElementById: (id: string) => elements.get(id) ?? null,
			createElement: () => new StyleElement(),
			head,
		},
		elements,
		order,
	};
}

const mainStyles = createStyleDocument();
const detachedStyles = createStyleDocument();
const writer = new GameStyleWriter();
writer.addDocument(mainStyles.document as unknown as Document);
writer.applyGameStyle(workspaceCss);
const styleElement = mainStyles.elements.get("brumes-game-style");
assert.equal(styleElement?.textContent, workspaceCss);
writer.applyGameStyle(".brumes--city-of-mist { --city-only: true; }");
assert.equal(
	styleElement?.textContent,
	".brumes--city-of-mist { --city-only: true; }",
);
assert.doesNotMatch(styleElement?.textContent ?? "", /test-note/);
writer.applyPackStyle("body.brumes--city-of-mist .inline-title { text-decoration: underline; }");
assert.deepEqual(mainStyles.order, ["brumes-game-style", "brumes-pack-style"]);
assert.match(mainStyles.elements.get("brumes-pack-style")?.textContent ?? "", /body\.brumes--city-of-mist/);
writer.addDocument(detachedStyles.document as unknown as Document);
assert.deepEqual(detachedStyles.order, ["brumes-game-style", "brumes-pack-style"]);
assert.equal(detachedStyles.elements.get("brumes-pack-style")?.textContent, mainStyles.elements.get("brumes-pack-style")?.textContent);
writer.applyPackStyle("");
assert.equal(mainStyles.elements.has("brumes-pack-style"), false);
assert.equal(detachedStyles.elements.has("brumes-pack-style"), false);
writer.removeGameStyle();
assert.equal(mainStyles.elements.size, 0);
assert.equal(detachedStyles.elements.size, 0);

const adrenalinePage = readFileSync(
	"src/styles/adrenaline/_page.scss",
	"utf8",
);
const adrenalineCallouts = readFileSync(
	"src/styles/adrenaline/_callouts.scss",
	"utf8",
);
assert.match(adrenalinePage, /\.markdown-source-view/);
assert.match(adrenalinePage, /\.markdown-reading-view/);
assert.doesNotMatch(
	adrenalinePage,
	/theme-(?:light|dark)|brumes--colour-(?:light|dark)/,
	"Adrenaline page styles take their polarity from the pack tokens, never from a selector",
);
assert.equal(
	(adrenalinePage.match(/brumes--workspace-theme/g) ?? []).length,
	1,
	"Adrenaline page styles may mention the workspace toggle only once",
);
assert.match(
	adrenalinePage,
	/&\.brumes--workspace-theme :focus-visible/,
	"the sole workspace exception must be its keyboard focus indicator",
);
assert.doesNotMatch(
	adrenalinePage,
	/brumes--workspace-theme[^{}]*\{[^}]*adrenaline-page-texture/,
);
assert.doesNotMatch(adrenalineCallouts, /brumes--workspace-theme/);
assert.doesNotMatch(
	`${adrenalinePage}\n${adrenalineCallouts}`,
	/(^|[,{]\s*)\.theme-(?:light|dark)(?:\s|[,{}])/m,
);

assert.equal(normalizeSettings(undefined).colourScheme, "obsidian");
assert.equal(
	normalizeSettings({ colourScheme: "light" }).colourScheme,
	"light",
);
assert.equal(normalizeSettings({ colourScheme: "dark" }).colourScheme, "dark");
assert.deepEqual(normalizeSettings(undefined).gameVariants, {});
assert.deepEqual(normalizeSettings({ gameVariants: { otherscape: "retired" } }).gameVariants, {});
assert.equal(
	normalizeSettings({ colourScheme: "sepia" as "dark" }).colourScheme,
	"obsidian",
);
assert.match(
	workspaceCss,
	/body\.brumes--legend-in-the-mist\.brumes--workspace-theme\s*\{[^}]*--test-workspace-light: workspace-light/,
);

class El {
	doc = documentStub;
	children: El[] = [];
	textContent = "";
	dataset: Record<string, string> = {};
	title = "";
	private classes = new Set<string>();
	classList = {
		add: (...names: string[]) =>
			names.forEach((name) => this.classes.add(name)),
		contains: (name: string) => this.classes.has(name),
	};

	appendChild(child: El): El {
		this.children.push(child);
		return child;
	}

	addEventListener(): void {}
}

const documentStub = {
	createElement: () => new El(),
};

type Processor = (
	source: string,
	el: El,
	ctx: { sourcePath: string; getSectionInfo: (el: El) => undefined },
) => void;
const processors = new Map<string, Processor>();
const plugin = {
	settings: {
		...DEFAULT_SETTINGS,
		mode: "legend-in-the-mist",
		features: { ...DEFAULT_SETTINGS.features },
	},
	registerMarkdownCodeBlockProcessor: (id: string, processor: Processor) => {
		processors.set(id, processor);
	},
};

loadBrumesBlocks(plugin as unknown as BrumesPlugin);

const container = new El();
processors.get("theme-card")?.(
	"adventure\nrelic\n{The Drowned Crown}\n{Commands the tide}\n{!Heavier every day}",
	container,
	{ sourcePath: "style-scope.md", getSectionInfo: () => undefined },
);

assert.equal(container.classList.contains(BLOCK_SCOPE_CLASS), true);
assert.equal(container.classList.contains(MODE_CLASS), true);

/* ------------------------------------------------------------------ *
 * A token name is trusted structurally, never in content: it reaches
 * `renderTokens` verbatim once `readPackTokens` accepts it, so a name that
 * could close its own declaration must never get that far.
 * ------------------------------------------------------------------ */

const maliciousTokens = readPackTokens(
	{
		"--safe-token": "red",
		"--evil} body { background: url(https://example.com/exfil?": "x",
		"--also-evil; } .brumes--city-of-mist": "x",
	},
	"style scope injection probe",
);

assert.deepEqual(Object.keys(maliciousTokens), ["--safe-token"]);

const injectedCss = buildGameStyle(
	"legend-in-the-mist",
	{
		base: {
			note: maliciousTokens,
			workspace: {},
		},
		light: { note: {}, workspace: {} },
		dark: { note: {}, workspace: {} },
	},
	false,
	[],
);

assert.doesNotMatch(injectedCss, /exfil/);
assert.doesNotMatch(injectedCss, /evil/);
assert.match(injectedCss, /--safe-token: red/);

console.log("game styles stay inside notes and rendered block scopes");
