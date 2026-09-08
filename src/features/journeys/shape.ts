import { BlockShape } from "../blocks/shape";

const SECTION = "brumes-journey--section";

/** The zones of a Legend in the Mist journey, as the renderer draws them. */
export const journeyShape: BlockShape = {
	block: "litm-journey",
	root: "brumes-journey",
	zones: [
		{ name: "header", holds: "the journey's type, then its name" },
		{
			name: "description",
			holds: "the description, one paragraph per line",
			family: SECTION,
			optional: true,
		},
		{
			name: "tags",
			holds: "the journey's tags",
			heading: "Tags",
			family: SECTION,
			optional: true,
		},
		{
			name: "benefits",
			holds: "what completing the journey earns",
			heading: "Benefits",
			family: SECTION,
			optional: true,
		},
		{
			name: "consequences",
			holds: "the consequences that hold for the whole journey",
			heading: "General consequences",
			family: SECTION,
			optional: true,
		},
		{
			name: "vignettes",
			holds: "the vignettes, each a name, a trigger and its consequences",
			heading: "Vignettes",
			family: SECTION,
			optional: true,
		},
	],
};
