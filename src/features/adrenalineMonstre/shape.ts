import { BlockShape } from "../blocks/shape";

export const adrenalineMonsterShape: BlockShape = {
	block: "adrenaline-monstre",
	root: "brumes-adrenaline-monstre",
	zones: [
		{ name: "header", holds: "name, creature type and danger level" },
		{ name: "mobility", holds: "detection and movement", heading: "Détection et déplacement", optional: true },
		{ name: "behaviour", holds: "actions and behaviour", heading: "Actions et comportement", optional: true },
		{ name: "characteristics", holds: "physical and optional mental characteristics", heading: "Caractéristiques" },
		{ name: "health", holds: "health and protections", heading: "Santé et protections", optional: true },
		{ name: "capabilities", holds: "traits, alternate state, competences, equipment, contagion and narrative", heading: "Capacités", optional: true },
	],
};
