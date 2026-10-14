/** The block inserted by the menu: every section of the sheet, filled with values to replace. */
export const pnjTemplate = (): string =>
	`\`\`\`adrenaline-pnj
nom = "Nouveau PNJ"
niveauDeDanger = 2
description = "Description du personnage"
[identite]
nationalite = "Nationalité"
genre = "Genre"
age = 30
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
solidite = 3
[protections.mentales]
solidite = 3
[equipement]
possessions = ["Objet porté"]
[[formations]]
pourcentage = 20
type = "classe-sociale"
nom = "Classe sociale"
[[formations]]
pourcentage = 20
type = "professionnelle"
nom = "Formation professionnelle"
[[formations]]
pourcentage = 20
type = "personnelle"
nom = "Formation personnelle"
[[competences]]
nom = "Compétence"
caracteristique = "per"
pourcentage = 30
[narratif]
role = "Rôle dans le scénario"
attitude = "Attitude envers le groupe"
personnalite = ["Trait de caractère"]
notesMj = ["Note pour le meneur de jeu"]
\`\`\`
`;
