import { BrumesBlock } from "../blocks/types";
import { JourneyData, parseJourney } from "./parser";
import { renderJourney } from "./renderer";
import { journeyShape } from "./shape";

function journeyTemplate(): string {
	return [
		"```litm-journey",
		"Landscape",
		"Journey name",
		": What the party travels through, in one line.",
		"tags: a tag, another tag",
		"CONSEQUENCES",
		"> Something that can happen anywhere (effect)",
		"VIGNETTE Vignette name : What sets the scene.",
		"> A consequence of this vignette (effect)",
		"```",
		"",
	].join("\n");
}

export const journeyBlock: BrumesBlock<JourneyData> = {
	id: "litm-journey",
	mode: "legend-in-the-mist",
	flag: "journeyParser",
	label: "Journey",
	icon: "route",
	shape: journeyShape,
	parse: parseJourney,
	render: renderJourney,
	template: journeyTemplate,
};
