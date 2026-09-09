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
assert.deepEqual(readEquipment(document.equipement)?.possessions, ["Radio"]);
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

console.log("Adrenaline document assertions passed.");
