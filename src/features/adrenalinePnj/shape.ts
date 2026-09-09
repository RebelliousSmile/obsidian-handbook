import { BlockShape } from "../blocks/shape";

export const adrenalinePnjShape: BlockShape = {
	block: "adrenaline-pnj",
	root: "brumes-adrenaline-pnj",
	zones: [
		{ name: "header", holds: "name, role and danger level" },
		{ name: "narrative", holds: "description and play guidance", heading: "Présentation", optional: true },
		{ name: "characteristics", holds: "available characteristics", heading: "Caractéristiques", optional: true },
		{ name: "health", holds: "health and protections", heading: "Santé et protections", optional: true },
		{ name: "competences", holds: "formations and competences", heading: "Formations et compétences", optional: true },
		{ name: "equipment", holds: "possessions and weapons", heading: "Équipement", optional: true },
		{ name: "provenance", holds: "publication provenance", optional: true },
	],
};
