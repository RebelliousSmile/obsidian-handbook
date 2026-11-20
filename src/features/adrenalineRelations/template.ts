/** The block inserted by the menu: the header, one other character and one NPC to replace. */
export const relationsTemplate = (): string =>
	`\`\`\`adrenaline-relations
personnage = "Nouveau personnage"
joueur = "Nom du joueur"
partie = "Nom de la partie"
testsDeDrame = 0
[[autresPersonnages]]
nom = "Autre personnage"
ceQueJeSais = "Ce que je sais de lui"
[[pnjs]]
numero = 1
nom = "Nouveau PNJ"
attitude = "indifferente"
[pnjs.lien]
type = "amitie"
\`\`\`
`;
