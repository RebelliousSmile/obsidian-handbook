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

export const pbtaSprawlMatrixShape: BlockShape = {
	block: "sprawl-matrix",
	root: "handbook-sprawl-matrix",
	zones: [
		{ name: "identity", holds: "avatar name" },
		{ name: "avatar", holds: "avatar description and image", optional: true },
		{ name: "console", holds: "resistance, firewall, stealth and processor", optional: true },
		{ name: "holds", holds: "holds kept", optional: true },
		{ name: "programs", holds: "programs to tick", optional: true },
	],
};

export const pbtaSprawlMissionShape: BlockShape = {
	block: "sprawl-mission",
	root: "handbook-sprawl-mission",
	zones: [
		{ name: "identity", holds: "mission name and how the crew gets the job" },
		{ name: "countdowns", holds: "investigation and action hour tracks with their steps", optional: true },
		{ name: "situation", holds: "involved parties, security, what is going on and the twist", optional: true },
		{ name: "directives", holds: "mission directives", optional: true },
		{ name: "pay", holds: "how the crew gets paid, written under the sheet", optional: true },
	],
};

export const pbtaSprawlCardShape: BlockShape = {
	block: "sprawl-card",
	root: "handbook-sprawl-card",
	zones: [
		{ name: "identity", holds: "card name and, for a threat, its type" },
		{ name: "body", holds: "objective, expertise, custom moves or skills", optional: true },
		{ name: "clock", holds: "hour track of a threat or a corporation", optional: true },
		{ name: "context", holds: "description written under the card", optional: true },
	],
};
