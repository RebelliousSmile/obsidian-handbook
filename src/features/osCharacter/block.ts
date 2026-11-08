import { BrumesBlock } from "../blocks/types";
import { OS_BLOCK_IDS, OS_FEATURE_FLAGS } from "../otherscape/types";
import { OsCharacterData, parseOsCharacter } from "./parser";
import { renderOsCharacter } from "./renderer";
import { osCharacterShape } from "./shape";

export const osCharacterBlock: BrumesBlock<OsCharacterData> = {
	id: OS_BLOCK_IDS.character,
	mode: "otherscape",
	flag: OS_FEATURE_FLAGS.character,
	label: "Character :Otherscape",
	icon: "user",
	shape: osCharacterShape,
	parse: parseOsCharacter,
	render: renderOsCharacter,
	template: () => [
		"```os-character",
		'name = "Character name"',
		"",
		"[[themes]]",
		'title_tag = "Title tag"',
		'theme_type = "self"',
		'power_tags = ["power tag"]',
		'weakness_tags = ["weakness tag"]',
		'quest = "The quest of the theme."',
		"",
		"[[tag_combos]]",
		'label = "What the combo is for"',
		'tags = ["Title tag", "power tag"]',
		"power = 2",
		'effect = "**Attack** *hurt*"',
		"",
		"[[loadout]]",
		'name = "Loadout item"',
		"loaded = true",
		"```",
		"",
	].join("\n"),
};
