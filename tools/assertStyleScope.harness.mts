import assert from "node:assert/strict";
import type BrumesPlugin from "../src/BrumesPlugin";
import { loadBrumesBlocks } from "../src/features/blocks/registry";
import { buildGameStyle } from "../src/features/modes/styleElement";
import {
	DEFAULT_SETTINGS,
	normalizeSettings,
} from "../src/settings/types";

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
assert.doesNotMatch(forcedDarkCss, /--forced-light/);

assert.equal(normalizeSettings(undefined).colourScheme, "obsidian");
assert.equal(normalizeSettings({ colourScheme: "light" }).colourScheme, "light");
assert.equal(normalizeSettings({ colourScheme: "dark" }).colourScheme, "dark");
assert.equal(normalizeSettings(undefined).gameVariants.otherscape, "metro");
assert.equal(
	normalizeSettings({ gameVariants: { otherscape: "retired" } }).gameVariants
		.otherscape,
	"metro",
);
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
		add: (...names: string[]) => names.forEach((name) => this.classes.add(name)),
		contains: (name: string) => this.classes.has(name),
	};

	appendChild(child: El): El {
		this.children.push(child);
		return child;
	}
}

const documentStub = {
	createElement: () => new El(),
};

type Processor = (
	source: string,
	el: El,
	ctx: { sourcePath: string },
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
	{ sourcePath: "style-scope.md" },
);

assert.equal(container.classList.contains(BLOCK_SCOPE_CLASS), true);
assert.equal(container.classList.contains(MODE_CLASS), true);

console.log("game styles stay inside notes and rendered block scopes");
