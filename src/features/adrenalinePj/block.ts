import { BrumesBlock } from "../blocks/types";
import { AdrenalinePjData, parseAdrenalinePj } from "./parser";
import { renderAdrenalinePj } from "./renderer";
import { adrenalinePjShape } from "./shape";

function template(): string {
	return `\`\`\`adrenaline-pj
nom = "Nouveau personnage"
[caracteristiques]
for = 30
con = 30
dex = 30
rap = 30
log = 30
vol = 30
per = 30
cha = 30
[sante.physique.superficiel]
base = 5
[sante.physique.leger]
base = 11
[sante.physique.grave]
base = 16
[sante.physique.profond]
base = 21
[sante.mental.superficiel]
base = 5
[sante.mental.leger]
base = 11
[sante.mental.grave]
base = 16
[sante.mental.profond]
base = 21
[identite]
nationalite = "Nationalité"
genre = "Genre"
age = 30
historique = "Historique du personnage"
personnalite = "Traits de caractère"
[parametresDuJeu]
joueur = "Nom du joueur"
typeDeCreation = "equitable"
typeDeScenario = "one-shot"
scenario = "Nom du scénario"
[equipement]
possessions = ["Objet porté"]
[[formations]]
pourcentage = 20
type = "classe-sociale"
nom = "Classe sociale"
[[formations.competences]]
pourcentage = 30
nom = "Compétence"
[[formations]]
pourcentage = 20
type = "professionnelle"
nom = "Formation professionnelle"
[[formations.competences]]
pourcentage = 30
nom = "Compétence"
[[formations]]
pourcentage = 20
type = "personnelle"
nom = "Formation personnelle"
[[formations.competences]]
pourcentage = 30
nom = "Compétence"
\`\`\`
`;
}

export const adrenalinePjBlock: BrumesBlock<AdrenalinePjData> = {
	id: "adrenaline-pj",
	capability: "block:adrenaline-pj",
	label: "Fiche PJ Adrenaline",
	icon: "user-round",
	shape: adrenalinePjShape,
	parse: parseAdrenalinePj,
	render: renderAdrenalinePj,
	template,
};
