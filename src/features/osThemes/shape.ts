import { BlockShape } from "../blocks/shape";

const common = [
	{ name: "header", holds: "the theme type, category, title tag and source" },
	{ name: "quest", holds: "the theme's quest", optional: true },
	{ name: "power-tags", holds: "the power tags", optional: true },
	{ name: "weakness-tags", holds: "the weakness tags", optional: true },
];

export const osThemeShape: BlockShape = {
	block: "os-theme",
	root: "brumes-os-theme",
	zones: [
		...common,
		{ name: "tracks", holds: "the three-place Upgrade and Decay tracks", optional: true },
	],
};

export const osThemeKitShape: BlockShape = {
	block: "os-theme-kit",
	root: "brumes-os-theme",
	zones: common,
};
