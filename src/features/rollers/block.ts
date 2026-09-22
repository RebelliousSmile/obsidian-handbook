import type { BrumesBlock } from "../blocks/types";
import { parseRoller, type RollerData } from "./parser";
import { renderRoller } from "./renderer";
import { rollerShape } from "./shape";

export const rollerBlock: BrumesBlock<RollerData> = {
	id: "roller",
	flag: "roller",
	utility: true,
	label: "Roller table",
	icon: "dices",
	shape: rollerShape,
	parse: parseRoller,
	render: renderRoller,
	template: () => [
		"```roller",
		"| Result |",
		"| --- |",
		"| First option |",
		"| Second option |",
		"```",
		"",
	].join("\n"),
};
