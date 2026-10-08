import type { BlockShape } from "../blocks/shape";

export const pbtaPlaybookShape: BlockShape = {
	block: "pbta-playbook",
	root: "handbook-pbta-playbook",
	zones: [
		{ name: "identity", holds: "playbook name, game and description" },
		{ name: "editorial", holds: "canonical playbook editorial sections", optional: true },
		{ name: "stats", holds: "canonical starting stat values", optional: true },
		{ name: "attributes", holds: "canonical playbook attributes", optional: true },
		{ name: "moves", holds: "move references and inline moves", optional: true },
		{ name: "choices", holds: "choice sets", optional: true },
		{ name: "creation", holds: "character creation questions", optional: true },
		{ name: "gear", holds: "starting and selectable gear", optional: true },
		{ name: "advancement", holds: "advancement options", optional: true },
		{ name: "mechanics", holds: "game-specific playbook mechanics", optional: true },
	],
};

export const pbtaNpcShape: BlockShape = {
	block: "pbta-npc",
	root: "handbook-pbta-npc",
	zones: [
		{ name: "identity", holds: "character name, description, drive and game-specific lines" },
		{ name: "moves", holds: "move lines or references", optional: true },
	],
};

export const pbtaTeamShape: BlockShape = {
	block: "pbta-team",
	root: "handbook-pbta-team",
	zones: [
		{ name: "identity", holds: "team name and epigraph" },
		{ name: "start", holds: "getting started and setup lines", optional: true },
		{ name: "choices", holds: "enemies, allies, maneuvers, assets and styles to tick" },
		{ name: "improvement", holds: "improvement track and its options", optional: true },
		{ name: "context", holds: "introduction written under the card", optional: true },
	],
};

export const pbtaMonsterShape: BlockShape = {
	block: "pbta-monster",
	root: "handbook-pbta-monster",
	zones: [
		{ name: "identity", holds: "monster name, type and bestiary" },
		{ name: "motivation", holds: "what the monster wants" },
		{ name: "statblock", holds: "powers, attacks, harm, armour and weaknesses", optional: true },
		{ name: "context", holds: "description written under the card", optional: true },
	],
};

export const pbtaThreatShape: BlockShape = {
	block: "pbta-threat",
	root: "handbook-pbta-threat",
	zones: [
		{ name: "identity", holds: "threat name, type and mystery" },
		{ name: "motivation", holds: "what the threat wants" },
		{ name: "stages", holds: "steps of the plan to tick", optional: true },
		{ name: "statblock", holds: "powers, attacks, harm, armour and weaknesses", optional: true },
		{ name: "context", holds: "description written under the card", optional: true },
	],
};

export const pbtaMoveShape: BlockShape = {
	block: "pbta-move",
	root: "handbook-pbta-move",
	zones: [
		{ name: "identity", holds: "move name, type, audience and description" },
		{ name: "trigger", holds: "canonical trigger", optional: true },
		{ name: "roll", holds: "roll type, formula and modifier", optional: true },
		{ name: "choices", holds: "canonical choice instructions", optional: true },
		{ name: "results", holds: "roll outcomes", optional: true },
		{ name: "tags", holds: "canonical tags", optional: true },
	],
};
