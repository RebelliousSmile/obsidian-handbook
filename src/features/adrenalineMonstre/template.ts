/** The block inserted by the menu: every section of the sheet, filled with values to replace. */
export const monsterTemplate = (): string =>
	`\`\`\`adrenaline-monstre
nom = "Nouvelle créature"
typeDeCorps = "Type de corps"
instinct = "Instinct dominant"
description = "Description de la créature"
niveauDeDanger = 3
zoneDeDetection = "Portée de détection"
deplacement = "Vitesse de déplacement"
actionsParRound = 1
comportement = ["Comportement en combat"]
traitsSpeciaux = ["Trait spécial"]
[caracteristiques]
for = 30
con = 30
dex = 30
rap = 30
per = 30
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
[[competences]]
nom = "Compétence"
pourcentage = 30
[narratif]
role = "Rôle dans le scénario"
attitude = "Attitude envers le groupe"
personnalite = ["Trait de caractère"]
notesMj = ["Note pour le meneur de jeu"]
\`\`\`
`;
