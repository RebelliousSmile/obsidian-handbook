import { BlockShape } from "../blocks/shape";

/** The zones of a Legend in the Mist theme kit, as the renderer draws them. */
export const themeKitShape: BlockShape = {
	block: "litm-theme-kit",
	root: "brumes-theme-kit",
	zones: [
		{
			name: "category",
			holds: "the themebook the kit belongs to, in capitals",
			optional: true,
		},
		{ name: "name", holds: "the kit's name" },
		{
			name: "power-tags",
			holds: "the power tags",
			family: "brumes-theme-kit--tags",
			optional: true,
		},
		{
			name: "weakness-tags",
			holds: "the weakness tags",
			family: "brumes-theme-kit--tags",
			optional: true,
		},
		{ name: "quest", holds: "the quest the kit answers", optional: true },
		{
			name: "improvement",
			holds: "the improvement's name, then its effect",
			optional: true,
		},
	],
};
