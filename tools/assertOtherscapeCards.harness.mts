import assert from "node:assert/strict";
import {
	OTHERSCAPE_QUEST_LABELS,
	OTHERSCAPE_THEME_TYPE_LABELS,
	OTHERSCAPE_ZONE_LABELS,
} from "schema-in-the-mist";
import { parseOsCharacterTrope, parseOsLoadoutItem } from "../src/features/osCharacterCreation/parser";
import { renderOsCreation } from "../src/features/osCharacterCreation/renderer";
import { osCreationToToml } from "../src/features/osCharacterCreation/schema";
import { parseOsPowerSet } from "../src/features/osChallenges/parser";
import { powerSetStars, renderOsProfile } from "../src/features/osChallenges/renderer";
import { osProfileToToml } from "../src/features/osChallenges/schema";
import { parseOsCharacter } from "../src/features/osCharacter/parser";
import { renderOsCharacter } from "../src/features/osCharacter/renderer";
import { osCharacterToToml } from "../src/features/osCharacter/schema";
import { parseOsTheme, parseOsThemeKit } from "../src/features/osThemes/parser";
import { renderOsTheme } from "../src/features/osThemes/renderer";
import { osThemeToToml } from "../src/features/osThemes/schema";

/* The four Otherscape families pose the hooks their cards are drawn on: every class and
   wording below is read by the pack's sheet. Handbook writes no colour here, and the
   wordings come from the labels the contract publishes. */

class El {
	textContent = "";
	children: El[] = [];
	dataset: Record<string, string> = {};
	classes: string[] = [];
	type = "";
	disabled = false;
	style: Record<string, string> = {};
	classList = { add: (...names: string[]) => this.classes.push(...names) };
	constructor(public tagName: string) {}
	appendChild(child: El): El {
		this.children.push(child);
		return child;
	}
}
const doc = { createElement: (tagName: string) => new El(tagName) } as unknown as Document;
const asEl = (element: HTMLElement) => element as unknown as El;

function all(root: El): El[] {
	return [root, ...root.children.flatMap(all)];
}
function byClass(root: El, name: string): El[] {
	return all(root).filter((element) => element.classes.includes(name));
}
function one(root: El, name: string): El {
	const found = byClass(root, name);
	assert.equal(found.length, 1, `exactly one .${name}, found ${found.length}`);
	return found[0];
}
function text(element: El): string {
	return element.textContent + element.children.map(text).join("");
}
function headings(root: El): string[] {
	return all(root).filter((element) => element.tagName === "h4").map(text);
}

/* Theme kit: typed header, description, published zone headings, the Special behind its box. */
const kitSource = [
	'title_tag = "Back-Alley Ripperdoc"',
	'theme_type = "self"',
	'description = """',
	"You patch up the people the clinics turn away.",
	"",
	'Every favour has a name attached."""',
	'category = "EXPERTISE"',
	'power_tags = ["steady hands"]',
	'weakness_tags = ["owes the wrong people"]',
	'quest = "Keep the clinic open."',
	"",
	"[special]",
	'name = "House Calls"',
	'description = "Treat a {wound} as one tier less."',
	"",
].join("\n");
const kit = parseOsThemeKit(kitSource);
assert.ok(kit);
assert.equal(kit.description, "You patch up the people the clinics turn away.\n\nEvery favour has a name attached.");
assert.deepEqual(kit.special, { name: "House Calls", description: "Treat a {wound} as one tier less." });
const kitCard = asEl(renderOsTheme(kit, doc));
assert.ok(kitCard.classes.includes("brumes-os-theme--self"), "the type stays on the root class");
assert.equal(text(one(kitCard, "brumes-os-theme--icon")), "", "the icon slot is empty: the pack draws it");
assert.equal(text(one(kitCard, "brumes-os-theme--category")), "EXPERTISE");
assert.equal(text(one(kitCard, "brumes-os-theme--type-name")), OTHERSCAPE_THEME_TYPE_LABELS.self.fr);
assert.equal(one(kitCard, "brumes-os-theme--description").children.length, 2, "one paragraph per blank line");
assert.equal(text(one(kitCard, "brumes-os-theme--quest-label")), OTHERSCAPE_QUEST_LABELS.self.fr);
assert.deepEqual(headings(kitCard), [
	OTHERSCAPE_ZONE_LABELS["theme-kit"].power_tags.fr,
	OTHERSCAPE_ZONE_LABELS["theme-kit"].weakness_tags.fr,
	OTHERSCAPE_ZONE_LABELS["theme-kit"].special.fr,
]);
assert.equal(byClass(kitCard, "brumes-os-theme--tag-list").length, 2, "both tag lists share their family");
const box = one(kitCard, "brumes-os-theme--special-box");
assert.equal(box.tagName, "input");
assert.equal(box.type, "checkbox");
assert.equal(text(one(kitCard, "brumes-os-theme--special-name")), "House Calls");
assert.ok(all(kitCard).every((element) => Object.keys(element.style).length === 0), "Handbook writes no inline style");
assert.match(osThemeToToml(kit), /\[special\]\nname = "House Calls"/);
assert.deepEqual(parseOsThemeKit(osThemeToToml(kit)), kit, "the kit survives its TOML export");

/* Edge case: a kit without a Special prints no Special zone and no orphan box. */
const bare = parseOsThemeKit(kitSource.slice(0, kitSource.indexOf("[special]")));
assert.ok(bare);
const bareCard = asEl(renderOsTheme(bare, doc));
assert.equal(byClass(bareCard, "brumes-os-theme--special").length, 0);
assert.equal(all(bareCard).filter((element) => element.tagName === "input").length, 0);

/* A played theme reads the description and the Special its card prints, like a kit. */
const theme = parseOsTheme(['title_tag = "Debt"', 'theme_type = "noise"', 'description = "x"', 'power_tags = ["a"]', "upgrade = 1", "", "[special]", 'name = "Collector"', 'description = "Call in a {favour}."', ""].join("\n"));
assert.ok(theme);
assert.equal(theme.description, "x");
assert.deepEqual(theme.special, { name: "Collector", description: "Call in a {favour}." });
const themeCard = asEl(renderOsTheme(theme, doc));
assert.equal(text(one(themeCard, "brumes-os-theme--type-name")), OTHERSCAPE_THEME_TYPE_LABELS.noise.fr);
assert.equal(text(one(themeCard, "brumes-os-theme--special-name")), "Collector");
assert.match(osThemeToToml(theme), /\[special\]\nname = "Collector"/);

/* Without either, a played theme prints its lists bare. */
const bareTheme = parseOsTheme(['title_tag = "Debt"', 'theme_type = "noise"', 'power_tags = ["a"]', "upgrade = 1", ""].join("\n"));
assert.ok(bareTheme);
assert.equal(bareTheme.description, undefined);
assert.deepEqual(headings(asEl(renderOsTheme(bareTheme, doc))), []);

/* Power set: typed label, stars, tags & statuses under published headings. */
const powerSet = parseOsPowerSet([
	'name = "Source-Touched Berserk"',
	'type = "mythos"',
	"rating = 1",
	"optional_rating = 1",
	'tags_and_statuses = ["{enraged-2}", "{will not stay down}"]',
	"",
	"[[specials]]",
	'name = "Feels No Wound"',
	'description = "Ignores the first tier."',
	"",
].join("\n"));
assert.ok(powerSet);
assert.equal(powerSet.rating, 1);
assert.equal(powerSet.optionalRating, 1);
const powerCard = asEl(renderOsProfile(powerSet, doc));
assert.ok(powerCard.classes.includes("brumes-os-profile--mythos"), "the power set carries its type class");
assert.equal(text(one(powerCard, "brumes-os-profile--icon")), "");
assert.equal(text(one(powerCard, "brumes-os-profile--type-name")), OTHERSCAPE_THEME_TYPE_LABELS.mythos.fr);
assert.equal(text(one(powerCard, "brumes-os-profile--kind-name")), OTHERSCAPE_ZONE_LABELS["power-set"].kind.fr);
assert.equal(text(one(powerCard, "brumes-os-profile--rating")), "+⊕(⊕)");
assert.equal(powerSetStars(2), "+⊕⊕");
assert.equal(byClass(powerCard, "brumes-os-profile--tags").length, 1);
assert.deepEqual(headings(powerCard), [
	OTHERSCAPE_ZONE_LABELS["power-set"].tags_and_statuses.fr,
	OTHERSCAPE_ZONE_LABELS["power-set"].specials.fr,
]);
assert.deepEqual(parseOsPowerSet(osProfileToToml(powerSet)), powerSet, "the power set survives its TOML export");
const unrated = parseOsPowerSet(['name = "Old Blood"', 'type = "self"', "optional_rating = 1", ""].join("\n"));
assert.ok(unrated);
assert.equal(unrated.optionalRating, undefined, "parenthesised stars mean nothing without a rating");
assert.equal(byClass(asEl(renderOsProfile(unrated, doc)), "brumes-os-profile--rating").length, 0);

/* Trope: kit pages, choices behind boxes, highlighted loadout. */
const trope = parseOsCharacterTrope([
	'name = "Neon Exorcist"',
	'loadout = ["blessed {rounds}", "a pocket shrine"]',
	"",
	"[[theme_kits]]",
	'title_tag = "Back-Alley Ripperdoc"',
	'category = "EXPERTISE"',
	"page = 96",
	"",
	"[[choices]]",
	'title_tag = "Forbidden Cult"',
	'category = "AFFILIATION"',
	"page = 104",
	"",
	"[[choices]]",
	'title_tag = "Cold Signal"',
	'category = "RITUAL"',
	"page = 0",
	"",
].join("\n"));
assert.ok(trope && trope.kind === "character-trope");
assert.equal(trope.choices[1].page, undefined, "a page below 1 is not read");
const tropeCard = asEl(renderOsCreation(trope, doc));
assert.deepEqual(headings(tropeCard), [
	OTHERSCAPE_ZONE_LABELS["character-trope"].theme_kits.fr,
	OTHERSCAPE_ZONE_LABELS["character-trope"].choices.fr,
	OTHERSCAPE_ZONE_LABELS["character-trope"].loadout.fr,
]);
assert.equal(byClass(tropeCard, "brumes-os-creation--choice-box").length, 2, "one box per choice");
assert.equal(byClass(one(tropeCard, "brumes-os-creation--theme-kits"), "brumes-os-creation--choice-box").length, 0, "required kits take no box");
assert.deepEqual(byClass(tropeCard, "brumes-os-creation--kit-page").map(text), ["p. 96", "p. 104"]);
assert.equal(byClass(tropeCard, "brumes-os-creation--loadout-entry").length, 2);
assert.deepEqual(parseOsCharacterTrope(osCreationToToml(trope)), trope, "the trope survives its TOML export");

/* Item: four named cells for a table row. */
const item = parseOsLoadoutItem([
	'name = "Kestrel Whisperlink"',
	'description = "A quiet link."',
	'feature_tags = ["hard to jam"]',
	'weakness_tag = "needs line of sight"',
	"",
].join("\n"));
assert.ok(item);
const itemCard = asEl(renderOsCreation(item, doc));
assert.deepEqual(
	itemCard.children.map((cell) => cell.classes.filter((name) => name !== "brumes-os-creation--cell")[0]),
	["brumes-os-creation--header", "brumes-os-creation--description", "brumes-os-creation--feature-tags", "brumes-os-creation--weakness-tag"],
);
assert.ok(itemCard.children.every((cell) => cell.classes.includes("brumes-os-creation--cell")));

/* Character sheet: the published bands, a combo's tags joined by the pack, the loaded items
   before the unloaded ones (burnt), and each theme card with its description and Special. */
const character = parseOsCharacter([
	'name = "Vesper"',
	"",
	"[[themes]]",
	'title_tag = "Debt"',
	'theme_type = "noise"',
	'power_tags = ["favours owed"]',
	'description = "Everyone owes Vesper."',
	"[themes.special]",
	'name = "Collector"',
	'description = "Call in a {favour}."',
	"",
	"[[tag_combos]]",
	'label = "Cash a favour"',
	'tags = ["Debt", "favours owed"]',
	"power = 2",
	'effect = "**Convince** *ally-2*"',
	"",
	"[[loadout]]",
	'name = "burner phone"',
	"loaded = true",
	"",
	"[[loadout]]",
	'name = "spare drone"',
	'feature_tags = ["spare drone", "folds flat"]',
	'weakness_tag = "loud"',
	"",
].join("\n"));
assert.ok(character);
assert.equal(character.loadout[1].loaded, false, "an item without loaded is not loaded");
const sheet = asEl(renderOsCharacter(character, doc));
assert.deepEqual(headings(sheet), [
	OTHERSCAPE_ZONE_LABELS.character.upgrades.fr,
	OTHERSCAPE_ZONE_LABELS.character.tag_combos.fr,
	OTHERSCAPE_ZONE_LABELS.character.loadout.fr,
	OTHERSCAPE_ZONE_LABELS["theme-kit"].special.fr,
]);
assert.equal(byClass(sheet, "brumes-os-character--box").length, 2, "one box per upgrade choice");
assert.deepEqual(one(sheet, "brumes-os-character--combo-tags").children.map(text), ["Debt", "favours owed"]);
assert.equal(text(one(sheet, "brumes-os-character--combo-power")), `${OTHERSCAPE_ZONE_LABELS.character.power.fr} 2`);
const effect = one(sheet, "brumes-os-character--combo-effect");
assert.deepEqual(effect.children.map((part) => part.tagName), ["strong", "span", "em"], "inline Markdown: strong and emphasis become elements");
assert.equal(text(effect.children[0]), "Convince");
const loaded = one(sheet, "brumes-os-character--loaded");
const unloaded = one(sheet, "brumes-os-character--unloaded");
const itemTag = (entry: El) => entry.children[0] as unknown as { className: string; textContent: string };
assert.doesNotMatch(itemTag(loaded.children[0]).className, /brumes-burnt/);
assert.match(itemTag(unloaded.children[0]).className, /brumes-burnt/);
assert.deepEqual(unloaded.children[0].children.map(text), ["spare drone", "folds flat", "loud"]);
assert.equal(text(one(sheet, "brumes-os-theme--special-name")), "Collector");
assert.equal(byClass(sheet, "brumes-os-theme--description").length, 1);
assert.match(osCharacterToToml(character), /\[\[loadout\]\]\nname = "burner phone"\nloaded = true/);

/* A bare sheet keeps its name and the published Upgrades, and nothing else. */
const bareSheet = parseOsCharacter('name = "Nobody"\n');
assert.ok(bareSheet);
assert.deepEqual(headings(asEl(renderOsCharacter(bareSheet, doc))), [OTHERSCAPE_ZONE_LABELS.character.upgrades.fr]);
assert.equal(parseOsCharacter('title = "no name"\n'), null);

console.log("Otherscape card hook assertions passed.");
