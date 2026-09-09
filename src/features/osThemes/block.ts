import { BrumesBlock } from "../blocks/types";
import { OS_BLOCK_IDS, OS_FEATURE_FLAGS } from "../otherscape/types";
import { OsThemeData, parseOsTheme, parseOsThemeKit } from "./parser";
import { renderOsTheme } from "./renderer";
import { osThemeKitShape, osThemeShape } from "./shape";

const themeDocument = (kit: boolean) => [
	`title_tag = "${kit ? "Back-Alley Ripperdoc" : "The Debt I Never Paid"}"`,
	'theme_type = "self"',
	'category = "AFFILIATION"',
	'power_tags = ["knows who to ask", "still has the old key"]',
	'weakness_tags = ["cannot refuse when they ask"]',
	'quest = "Settle the debt on my own terms."',
	...(kit ? [] : ["upgrade = 0", "decay = 0"]),
].join("\n");

export const osThemeBlock: BrumesBlock<OsThemeData> = {
	id: OS_BLOCK_IDS.theme, mode: "otherscape", flag: OS_FEATURE_FLAGS.theme,
	label: "Thème :Otherscape", icon: "file-plus", shape: osThemeShape,
	parse: parseOsTheme, render: renderOsTheme,
	template: () => `\`\`\`${OS_BLOCK_IDS.theme}\n${themeDocument(false)}\n\`\`\`\n`,
};

export const osThemeKitBlock: BrumesBlock<OsThemeData> = {
	id: OS_BLOCK_IDS.themeKit, mode: "otherscape", flag: OS_FEATURE_FLAGS.themeKit,
	label: "Kit de thème :Otherscape", icon: "book-open", shape: osThemeKitShape,
	parse: parseOsThemeKit, render: renderOsTheme,
	template: () => `\`\`\`${OS_BLOCK_IDS.themeKit}\n${themeDocument(true)}\n\`\`\`\n`,
};
