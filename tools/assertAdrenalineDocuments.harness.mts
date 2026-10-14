import assert from "node:assert/strict";
import { parse as parseToml } from "smol-toml";
import {
	displayedCompetenceTotal,
	parseAdrenalineDocument,
	readAdrenalineMeta,
	readCharacteristics,
	readCompetences,
	readEquipment,
	readHealth,
	readIdentity,
	readProtections,
	stringifyAdrenalineDocument,
} from "../src/features/adrenaline/document";
import { looksLikeToml, withoutCodeFence } from "../src/features/blocks/schemaValues";
import { adrenalinePjBlock } from "../src/features/adrenalinePj/block";
import { pnjTemplate } from "../src/features/adrenalinePnj/template";
import { monsterTemplate } from "../src/features/adrenalineMonstre/template";
import { documentToPnj } from "../src/features/adrenalinePnj/schema";
import { documentToMonster } from "../src/features/adrenalineMonstre/schema";
import { documentToPj } from "../src/features/adrenalinePj/schema";
import { upgradeLegacyPj } from "../src/features/adrenalinePj/legacyRanges";

const source = `
nom = "Ada"
[identite]
age = 34
[caracteristiques]
for = 40
con = 50
dex = 60
rap = 70
log = 30
vol = 40
per = 50
cha = 60
[sante.physique.superficiel]
base = 7
couvert = 9
[sante.mental.superficiel]
base = 5
[protections.physiques]
solidite = 7
[protections.mentales]
solidite = 5
[equipement]
possessions = ["Radio"]
[[competences]]
nom = "Observation"
pourcentage = 30
caracteristique = "per"
total = 99
[meta]
typeDePublication = "officiel"
source = "Contamination"
auteurs = ["A"]
page = 42
licence = "Usage autorisé"
`;

const document = parseAdrenalineDocument(source);
assert.ok(document);
const characteristics = readCharacteristics(document.caracteristiques);
assert.equal(characteristics?.for, 40);
assert.equal(Object.keys(characteristics ?? {}).length, 8);
assert.equal(readIdentity(document.identite)?.age, 34);
assert.equal(readHealth(document.sante)?.physique?.superficiel?.couvert, 9);
assert.equal(readProtections(document.protections)?.mentales?.solidite, 5);
assert.deepEqual(readEquipment(document.equipement, "pnj")?.possessions, ["Radio"]);
const competence = readCompetences(document.competences)[0];
assert.equal(competence.total, 99);
assert.equal(displayedCompetenceTotal(competence, characteristics), 80);
assert.deepEqual(readAdrenalineMeta(document.meta), {
	typeDePublication: "officiel",
	source: "Contamination",
	auteurs: ["A"],
	page: 42,
	licence: "Usage autorisé",
});

const output = stringifyAdrenalineDocument(document);
assert.deepEqual(parseToml(output), parseToml(source));
assert.equal(parseAdrenalineDocument("plain prose"), null);
assert.equal(parseAdrenalineDocument("nom = ["), null);
assert.equal(readIdentity({ age: "34", genre: "Femme" })?.genre, "Femme");
assert.equal(readIdentity({ age: "34", genre: "Femme" })?.age, undefined);
assert.equal(readCharacteristics({ for: -1, con: 20 })?.con, 20);
assert.equal(readHealth({ physique: { superficiel: { base: "7" } } }), undefined);

// Fields added to the player sheet: advantages and immunities, and the nature of a weapon die.
const pj = readEquipment({ avantagesEtImmunites: ["Immunisé"], armesPhysiques: [{ nom: "Couteau", nature: "blessante" }, { nom: "Poing", nature: "inconnue" }] }, "pj");
assert.deepEqual(pj?.avantagesEtImmunites, ["Immunisé"]);
assert.equal(pj?.armesPhysiques?.[0].nature, "blessante");
assert.equal(pj?.armesPhysiques?.[1].nature, undefined);
// A weapon is read as entered: its name, type, notes and die, none of them dropped on the way to the sheets.
const enteredWeapon = { nom: "Pied-de-biche", type: "Contact", notes: "Poignée usée", desDeDegats: 2, nature: "blessante" };
const readWeapon = readEquipment({ armesPhysiques: [enteredWeapon] }, "pj")?.armesPhysiques?.[0];
assert.deepEqual(
	{ nom: readWeapon?.nom, type: readWeapon?.type, notes: readWeapon?.notes, desDeDegats: readWeapon?.desDeDegats, nature: readWeapon?.nature },
	enteredWeapon,
	"a weapon keeps every field it entered",
);

// The sheet inserted by the menu is complete enough to be filled in: every section a player sheet
// edits is present, and the contract accepts the starter as written.
const starter = adrenalinePjBlock.template().split("\n").slice(1, -2).join("\n");
const starterPj = adrenalinePjBlock.parse(starter);
assert.ok(starterPj, "the starter of the player sheet is accepted");
assert.equal(starterPj.formations?.length, 3, "the starter carries the three formations");
assert.ok(
	starterPj.formations?.every((formation) => (formation.competences?.length ?? 0) > 0),
	"each formation of the starter carries a skill",
);
assert.ok(starterPj.identite && starterPj.parametresDuJeu && starterPj.equipement, "the starter carries identity, game parameters and equipment");

// The non-player and creature sheets are inserted complete as well, and the contract accepts them.
const unfenced = (template: string) => template.split("\n").slice(1, -2).join("\n");
const starterPnj = documentToPnj(parseAdrenalineDocument(unfenced(pnjTemplate())));
assert.ok(starterPnj, "the starter of the non-player sheet is accepted");
assert.equal(starterPnj.formations?.length, 3, "the non-player starter carries the three formations");
assert.ok((starterPnj.competences?.length ?? 0) > 0, "the non-player starter carries a skill");
assert.ok(starterPnj.identite && starterPnj.narratif && starterPnj.equipement, "the non-player starter carries identity, narrative and equipment");
const starterMonster = documentToMonster(parseAdrenalineDocument(unfenced(monsterTemplate())));
assert.ok(starterMonster, "the starter of the creature sheet is accepted");
assert.ok((starterMonster.competences?.length ?? 0) > 0, "the creature starter carries a skill");
assert.ok(starterMonster.narratif && starterMonster.comportement && starterMonster.traitsSpeciaux, "the creature starter carries narrative, behaviour and special traits");

// A block copied from a note arrives with its fence, and is pasted as the document it holds.
const fenced = "```adrenaline-pj\n" + starter + "\n```\n";
assert.equal(looksLikeToml(fenced), false, "the fence line is not a document");
assert.equal(looksLikeToml(withoutCodeFence(fenced)), true, "the document between the fences is");
assert.ok(adrenalinePjBlock.parse(withoutCodeFence(fenced).trim()), "a fenced block pastes as the sheet it holds");
assert.equal(withoutCodeFence(starter), starter, "a bare document is left as it is");

// A player sheet written before contract 5.0.0 carries ranges and keys the sheet no longer prints:
// it is still drawn, with the current value kept, and a conforming sheet is left as it is.
const range = (current: number) => ({ minimum: 0, current, maximum: current + 10 });
const legacy = {
	nom: "Naïma",
	caracteristiques: Object.fromEntries(["for", "con", "dex", "rap", "log", "vol", "per", "cha"].map((key) => [key, range(40)])),
};
const legacyDocument = {
	...legacy,
	sante: {
		physique: Object.fromEntries(["superficiel", "leger", "grave", "profond"].map((key) => [key, { base: range(5), couvert: range(7) }])),
		mental: Object.fromEntries(["superficiel", "leger", "grave", "profond"].map((key) => [key, { base: range(3) }])),
	},
	protections: { physiques: { solidite: range(4), armure: { points: range(2), des: 1 } } },
	formations: [{ type: "professionnelle", nom: "Terrain", pourcentage: range(30), competences: [{ nom: "Marcher", pourcentage: range(20), total: range(60), caracteristique: "for" }] }],
	etatDePartie: { etats: [{ nom: "Épuisé", localisation: "jambes" }], malus: { choc: { heures: 3 } } },
	parametresDuJeu: { px: range(12) },
};
const upgradedLegacy = upgradeLegacyPj(legacyDocument as Record<string, unknown>) as Record<string, any>;
assert.equal(upgradedLegacy.caracteristiques.for, 40, "a characteristic range becomes its current value");
assert.equal(upgradedLegacy.sante.physique.grave.couvert, 7, "a threshold range becomes its current value");
assert.equal(upgradedLegacy.protections.physiques.solidite, undefined, "solidity is not on the player sheet");
assert.equal(upgradedLegacy.protections.physiques.armure.points, 2, "armour points become one number");
assert.equal(upgradedLegacy.formations[0].competences[0].total, undefined, "a skill's total is not printed");
assert.equal(upgradedLegacy.etatDePartie.etats, "Épuisé (jambes)", "states become one line each");
assert.equal(upgradedLegacy.etatDePartie.malus.choc.heures, undefined);
assert.deepEqual(upgradedLegacy.parametresDuJeu.px, range(12), "experience points keep their range");
assert.equal(
	(legacyDocument.caracteristiques as Record<string, unknown>).for !== undefined &&
		typeof (legacyDocument.caracteristiques as Record<string, unknown>).for === "object",
	true,
	"the document read is not modified",
);
const drawnLegacy = documentToPj(legacyDocument);
assert.ok(drawnLegacy, "a sheet written with ranges is drawn");
assert.deepEqual(drawnLegacy.parametresDuJeu?.px, range(12), "the experience points keep their range in the data read");
assert.deepEqual(upgradeLegacyPj(upgradedLegacy), upgradedLegacy, "a conforming sheet is left as it is");

console.log("Adrenaline document assertions passed.");
