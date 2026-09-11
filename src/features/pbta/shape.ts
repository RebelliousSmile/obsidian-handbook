import type { BlockShape } from "../blocks/shape";

export const pbtaPlaybookShape: BlockShape = {
	block: "pbta-playbook",
	root: "handbook-pbta-playbook",
	zones: [
		{ name: "identity", holds: "playbook name, game and description" },
		{ name: "stats", holds: "canonical starting stat values", optional: true },
		{ name: "attributes", holds: "canonical playbook attributes", optional: true },
		{ name: "moves", holds: "move references and inline moves", optional: true },
		{ name: "choices", holds: "choice sets", optional: true },
		{ name: "creation", holds: "character creation questions", optional: true },
		{ name: "gear", holds: "starting and selectable gear", optional: true },
		{ name: "advancement", holds: "advancement options", optional: true },
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
