import assert from "node:assert/strict";
import {
	GAME_PACKS,
	GAME_REGISTRATIONS,
	gameVariantClasses,
	normalizeGameVariantId,
	resolveGameRegistration,
} from "../src/games/registry";
import {
	effectiveColourScheme,
	resolveGameAppearance,
} from "../src/games/variants";
import {
	clearBrumesModeClasses,
	setBrumesVariantClass,
} from "../src/features/modes/domModeClass";

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

console.log("Game variant assertions passed.");
