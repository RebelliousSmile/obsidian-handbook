import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";
import {
	GAME_PACKS,
	GAME_REGISTRATIONS,
	gameVariantClasses,
	initGameRegistry,
	normalizeGameVariantId,
	resolveGameRegistration,
} from "../src/games/registry";
import {
	effectiveColourScheme,
	noteVariantId,
	publishedSection,
	resolveGameAppearance,
} from "../src/games/variants";
import { mergeGameStyle, parseGameOverride } from "../src/games/overrides";
import { log } from "../src/utils/logger";
import {
	clearBrumesModeClasses,
	setBrumesVariantClass,
} from "../src/features/modes/domModeClass";

assert.equal(resolveGameRegistration("city-of-mist").pack.id, "none");

const emptyStyle = {
	base: { note: {}, workspace: {} },
	light: { note: {}, workspace: {} },
	dark: { note: {}, workspace: {} },
};

initGameRegistry([
	{ pack: { id: "city-of-mist", label: "City of Mist", style: emptyStyle } },
	{ pack: { id: "legend-in-the-mist", label: "Legend in the Mist", style: emptyStyle } },
	{
		pack: {
			id: "otherscape",
			label: ":Otherscape",
			style: {
				base: { note: { "--font-text-theme": '"Roboto", sans-serif' }, workspace: {} },
				light: { note: {}, workspace: {} },
				dark: { note: { "--background-primary": "#102B27", "--h1-color": "#B8F53C" }, workspace: {} },
			},
		},
		installation: {
			root: "packs/otherscape", version: "1.0.0", minimumHandbookVersion: "2.7.0", requires: [],
			variants: [
				{ id: "metro", label: "Metro", style: {}, polarities: ["light", "dark"] },
				{ id: "cairo", label: "Cairo", style: { dark: { note: { "--background-primary": "#102B27" } } }, polarities: ["light", "dark"] },
				{ id: "tokyo", label: "Tokyo", style: {}, polarities: ["light", "dark"] },
			],
			defaultVariantId: "metro",
		},
	},
]);

assert.deepEqual(
	GAME_PACKS.map((pack) => pack.id),
	["city-of-mist", "legend-in-the-mist", "otherscape"],
);
assert.equal(GAME_REGISTRATIONS.length, 3);

const otherscape = resolveGameRegistration("otherscape");
assert.deepEqual(
	otherscape.variants?.map((variant) => variant.id),
	["metro", "cairo", "tokyo"],
);
assert.equal(normalizeGameVariantId("otherscape", "missing"), "metro");
assert.equal(normalizeGameVariantId("city-of-mist", "metro"), null);

assert.equal(resolveGameRegistration("adrenaline").pack.id, "city-of-mist");
assert.equal(normalizeGameVariantId("adrenaline", "metro"), null);

const cairo = resolveGameAppearance(otherscape, "cairo", {
	dark: { note: { "--h1-color": "#USER" } },
});
assert.equal(cairo.style.base.note["--font-text-theme"], '"Roboto", sans-serif');
assert.equal(cairo.style.dark.note["--background-primary"], "#102B27");
assert.equal(cairo.style.dark.note["--h1-color"], "#USER");
assert.deepEqual(cairo.polarities, ["light", "dark"]);

const city = resolveGameAppearance(resolveGameRegistration("city-of-mist"), null);
assert.deepEqual(city.style, GAME_PACKS[0].style);
assert.equal(city.variant, null);

assert.deepEqual(gameVariantClasses(), [
	"brumes--variant-metro",
	"brumes--variant-cairo",
	"brumes--variant-tokyo",
]);
assert.equal(effectiveColourScheme(["dark"], "light"), "dark");
assert.equal(effectiveColourScheme(["light", "dark"], "obsidian"), "obsidian");

const classes = new Set<string>([
	"brumes--variant-metro",
	"brumes--city-of-mist",
]);
const doc = {
	body: {
		classList: {
			add: (...names: string[]) => names.forEach((name) => classes.add(name)),
			remove: (...names: string[]) => names.forEach((name) => classes.delete(name)),
			get length() {
				return classes.size;
			},
			item: (index: number) => Array.from(classes)[index] ?? null,
		},
	},
} as unknown as Document;
setBrumesVariantClass("cairo", doc);
assert.equal(classes.has("brumes--variant-metro"), false);
assert.equal(classes.has("brumes--variant-cairo"), true);
clearBrumesModeClasses(doc);
assert.equal(Array.from(classes).some((name) => name.startsWith("brumes--")), false);

/* ------------------------------------------------------------------ *
 * The section a game publishes is held to its polarities, the user's
 * file included.
 * ------------------------------------------------------------------ */

const sectionStyle = {
	...emptyStyle,
	section: { note: { "--background-primary": "#111", "--text-normal": "#eee" } },
};
const sectionWarnings: string[] = [];
const realWarn = console.warn;
log.setLevel("warn");
console.warn = (...args: unknown[]) => { sectionWarnings.push(args.map(String).join(" ")); };

assert.deepEqual(publishedSection("one-paper", sectionStyle, ["light"]), sectionStyle.section.note);
assert.equal(sectionWarnings.length, 0, "one polarity reads the layer without a word");

// A second polarity leaves the layer unread, says so once, and refuses nothing.
assert.equal(publishedSection("two-papers", sectionStyle, ["light", "dark"]), null);
assert.equal(publishedSection("two-papers", sectionStyle, ["light", "dark"]), null);
assert.equal(sectionWarnings.filter((line) => line.includes('"two-papers"')).length, 1);
assert.equal(publishedSection("other-papers", sectionStyle, ["light", "dark"]), null);
assert.equal(sectionWarnings.filter((line) => line.includes('"other-papers"')).length, 1);

// Nothing to say of a game that publishes no section, whatever it holds.
assert.equal(publishedSection("plain", emptyStyle, ["light", "dark"]), null);
assert.equal(publishedSection("plain", emptyStyle, ["light"]), null);
assert.equal(publishedSection("empty", { ...emptyStyle, section: { note: {} } }, ["light", "dark"]), null);
assert.equal(publishedSection("no-paper", sectionStyle, []), null);
assert.equal(sectionWarnings.length, 2);

console.warn = realWarn;
log.setLevel("error");

// An override file written before the layer existed is read as it was: no
// section appears in what it says, nor in the style it is merged over.
const formerOverride = parseGameOverride(
	JSON.stringify({ style: { base: { note: { "--h1-color": "#abc" } }, dark: { note: { "--text-normal": "#fff" } } } }),
);
assert.deepEqual(formerOverride.style, {
	base: { note: { "--h1-color": "#abc" } },
	dark: { note: { "--text-normal": "#fff" } },
});
assert.equal("section" in mergeGameStyle(emptyStyle, formerOverride.style), false);
assert.deepEqual(mergeGameStyle(sectionStyle, formerOverride.style).section, sectionStyle.section);

// The same file may now tune the section, token by token.
const sectionOverride = parseGameOverride(
	JSON.stringify({ style: { section: { note: { "--text-normal": "#fff", "--bad;name": "x" } } } }),
);
assert.deepEqual(sectionOverride.style, { section: { note: { "--text-normal": "#fff" } } });
assert.deepEqual(mergeGameStyle(sectionStyle, sectionOverride.style).section, {
	note: { "--background-primary": "#111", "--text-normal": "#fff" },
});

// A variant rule applies only when its variant class sits on the element that
// carries the game mode: the body holds both. `body.brumes--variant-x &` under
// `.brumes--otherscape` compiled to a descendant of the body and never matched.
function misplacedVariantSelectors(css: string): string[] {
	const misplaced: string[] = [];
	postcss.parse(css).walkRules((rule) => {
		for (const selector of rule.selectors) {
			if (!selector.includes("brumes--variant-")) continue;
			selectorParser((root) => {
				root.each((complex) => {
					let compound: string[] = [];
					const compounds: string[][] = [compound];
					complex.each((node) => {
						if (node.type === "combinator") {
							compound = [];
							compounds.push(compound);
						} else if (node.type === "class") compound.push(node.value);
					});
					for (const classes of compounds) {
						if (!classes.some((name) => name.startsWith("brumes--variant-"))) continue;
						const hasGame = classes.some((name) => /^brumes--(?!variant-|colour-|fonts-|printer-)/.test(name));
						if (!hasGame) misplaced.push(String(complex).trim());
					}
				});
			}).processSync(selector);
		}
	});
	return misplaced;
}

assert.deepEqual(
	misplacedVariantSelectors("body.brumes--variant-cairo .brumes--otherscape .brumes-os-theme { color: red; }"),
	["body.brumes--variant-cairo .brumes--otherscape .brumes-os-theme"],
	"a variant class written as an ancestor of the game class is refused",
);
assert.deepEqual(misplacedVariantSelectors(".brumes--otherscape.brumes--variant-cairo .brumes-os-theme { color: red; }"), []);

const compiledStyles = (() => {
	try {
		return readFileSync(new URL("../dist/styles.css", import.meta.url), "utf8");
	} catch {
		throw new Error("dist/styles.css is missing: run the build before this assertion");
	}
})();
assert.ok(compiledStyles.includes("brumes--variant-"), "dist/styles.css carries no variant rule");
assert.deepEqual(misplacedVariantSelectors(compiledStyles), [], "variant rules that can never match the body");

// A note's `handbook-variant` wins only when the active game declares it.
{
	const registration = {
		pack: GAME_PACKS[0],
		variants: [
			{ id: "cairo", label: "Cairo", style: {}, polarities: [] },
			{ id: "metro", label: "Metro", style: {}, polarities: [] },
		],
		defaultVariantId: "metro",
	};
	assert.equal(noteVariantId(registration, { "handbook-variant": "cairo" }), "cairo");
	assert.equal(noteVariantId(registration, { "handbook-variant": " Cairo " }), "cairo");
	assert.equal(noteVariantId(registration, { "handbook-variant": "tokyo" }), null);
	assert.equal(noteVariantId(registration, { "handbook-variant": ["cairo"] }), null);
	assert.equal(noteVariantId(registration, {}), null);
	assert.equal(noteVariantId(registration, undefined), null);
	assert.equal(noteVariantId({ pack: GAME_PACKS[0] }, { "handbook-variant": "cairo" }), null);
	assert.equal(resolveGameAppearance(registration, noteVariantId(registration, { "handbook-variant": "cairo" }) ?? "metro").variant?.id, "cairo");
}

console.log("Game variant assertions passed.");
