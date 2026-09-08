import { BrumesBlock } from "../blocks/types";
import { ComDangerData, parseComDanger } from "./parser";
import { renderComDanger } from "./renderer";
import { comDangerShape } from "./shape";

function comDangerTemplate(): string {
	return [
		"```com-danger",
		"Danger name",
		"rating: 3",
		": What it is, in one line.",
		"SPECTRUMS",
		"hurt:3",
		"convinced:4 > They stand down and talk.",
		"COUNTDOWN",
		"alerted:5 > Reinforcements arrive.",
		"MOVES",
		"soft: What it does to raise the tension.",
		"hard: What it does when the players miss.",
		"custom: Move name > The rule it triggers.",
		"```",
		"",
	].join("\n");
}

export const comDangerBlock: BrumesBlock<ComDangerData> = {
	id: "com-danger",
	mode: "city-of-mist",
	flag: "comDangerParser",
	label: "Danger profile",
	icon: "skull",
	shape: comDangerShape,
	parse: parseComDanger,
	render: renderComDanger,
	template: comDangerTemplate,
};
