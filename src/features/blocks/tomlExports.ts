import type BrumesPlugin from "../../BrumesPlugin";
import { challengeBlock } from "../challenges/block";
import { challengeToToml } from "../challenges/schema";
import { comDangerBlock } from "../comDangers/block";
import { comDangerToToml } from "../comDangers/schema";
import { comThemeCardBlock } from "../comThemeCards/block";
import { comThemeCardToToml } from "../comThemeCards/schema";
import { journeyBlock } from "../journeys/block";
import { journeyToToml } from "../journeys/schema";
import { themeCardBlock } from "../themeCards/block";
import { themeCardToToml } from "../themeCards/schema";
import { themeKitBlock } from "../themeKits/block";
import { themeKitToToml } from "../themeKits/schema";
import {
	describeMissingPart,
	loadCopyAsTomlCommand,
	TomlExport,
} from "./copyAsToml";
import { osThemeBlock, osThemeKitBlock } from "../osThemes/block";
import { osThemeToToml } from "../osThemes/schema";
import { osChallengeBlock, osPowerSetBlock } from "../osChallenges/block";
import { osProfileToToml } from "../osChallenges/schema";
import { osCharacterTropeBlock, osLoadoutItemBlock } from "../osCharacterCreation/block";
import { osCreationToToml } from "../osCharacterCreation/schema";

/**
 * Every block that can leave the note as a schema document. The list holds all
 * six, and the guideline leaves no room for a seventh that would not be here:
 * a format without an upstream writes its own shape rather than being exempt
 * from having one.
 *
 * The list is exported rather than kept inside the loader so the corpus
 * harness can read it: the guideline says each block owes the schema a copy
 * command, and a rule nothing checks is the failure it is meant to prevent,
 * one level up. See `aidd_docs/guidelines/schema-design.md`.
 */
export const TOML_EXPORTS: TomlExport<unknown>[] = [
	{
		block: themeCardBlock,
		commandId: "copy-theme-card-as-toml",
		noun: "theme card",
		toToml: themeCardToToml,
		describeFailure: (source) =>
			describeMissingPart(
				source,
				"it has no title tag, add a line such as {Title Tag}",
			),
	},
	{
		block: challengeBlock,
		commandId: "copy-challenge-as-toml",
		noun: "challenge",
		toToml: challengeToToml,
		describeFailure: (source) =>
			describeMissingPart(source, "it must open with the challenge name"),
	},
	{
		block: journeyBlock,
		commandId: "copy-journey-as-toml",
		noun: "journey",
		toToml: journeyToToml,
		describeFailure: (source) =>
			describeMissingPart(
				source,
				"it must open with a landscape, occasion or undertaking line, then the name",
			),
	},
	{
		block: themeKitBlock,
		commandId: "copy-theme-kit-as-toml",
		noun: "theme kit",
		toToml: themeKitToToml,
		describeFailure: (source) =>
			describeMissingPart(
				source,
				"it needs a name and at least one power tag such as {Power Tag}",
			),
	},
	{
		block: comThemeCardBlock,
		commandId: "copy-com-theme-card-as-toml",
		noun: "city theme card",
		toToml: comThemeCardToToml,
		describeFailure: (source) =>
			describeMissingPart(
				source,
				"it must open with the themebook, then a title or a tag",
			),
	},
	{
		block: comDangerBlock,
		commandId: "copy-danger-as-toml",
		noun: "danger",
		toToml: comDangerToToml,
		describeFailure: (source) =>
			describeMissingPart(
				source,
				"it must open with the name and hold at least one section",
			),
	},
	{
		block: osThemeBlock,
		commandId: "copy-os-theme-as-toml",
		noun: ":Otherscape theme",
		toToml: osThemeToToml,
		describeFailure: (source) =>
			describeMissingPart(source, "title_tag et theme_type sont requis"),
	},
	{
		block: osThemeKitBlock,
		commandId: "copy-os-theme-kit-as-toml",
		noun: ":Otherscape theme kit",
		toToml: osThemeToToml,
		describeFailure: (source) =>
			describeMissingPart(source, "title_tag et theme_type sont requis"),
	},
	{
		block: osChallengeBlock,
		commandId: "copy-os-challenge-as-toml",
		noun: ":Otherscape challenge",
		toToml: osProfileToToml,
		describeFailure: (source) => describeMissingPart(source, "name est requis"),
	},
	{
		block: osPowerSetBlock,
		commandId: "copy-os-power-set-as-toml",
		noun: ":Otherscape power set",
		toToml: osProfileToToml,
		describeFailure: (source) => describeMissingPart(source, "name et type sont requis"),
	},
	{
		block: osCharacterTropeBlock,
		commandId: "copy-os-character-trope-as-toml",
		noun: ":Otherscape character trope",
		toToml: osCreationToToml,
		describeFailure: (source) => describeMissingPart(source, "name est requis"),
	},
	{
		block: osLoadoutItemBlock,
		commandId: "copy-os-loadout-item-as-toml",
		noun: ":Otherscape loadout item",
		toToml: osCreationToToml,
		describeFailure: (source) => describeMissingPart(source, "name est requis"),
	},
];

export function loadTomlExportCommands(plugin: BrumesPlugin): void {
	for (const spec of TOML_EXPORTS) {
		loadCopyAsTomlCommand(plugin, spec);
	}
}
