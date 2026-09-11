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
[protections.physiques]
solidite = 5
[protections.mentales]
solidite = 5
\`\`\`
`;
}

export const adrenalinePjBlock: BrumesBlock<AdrenalinePjData> = {
	id: "adrenaline-pj",
	mode: "adrenaline",
	label: "Fiche PJ Adrenaline",
	icon: "user-round",
	shape: adrenalinePjShape,
	parse: parseAdrenalinePj,
	render: renderAdrenalinePj,
	template,
};
