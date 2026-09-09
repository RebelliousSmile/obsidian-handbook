import { BlockShape } from "../blocks/shape";

export const adrenalinePjShape: BlockShape = {
	block: "adrenaline-pj",
	root: "brumes-adrenaline-pj",
	zones: [
		{ name: "header", holds: "name, identity and game parameters" },
		{ name: "formations", holds: "formation groups and values", heading: "Formations", optional: true },
		{ name: "competences", holds: "competences nested in formations", heading: "Compétences", optional: true },
		{ name: "characteristics", holds: "eight physical and mental characteristics", heading: "Caractéristiques" },
		{ name: "equipment", holds: "possessions and weapons", heading: "Équipement", optional: true },
		{ name: "health", holds: "health thresholds and protections", heading: "Santé et protections" },
	],
};
