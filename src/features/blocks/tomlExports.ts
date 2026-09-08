import type BrumesPlugin from "../../BrumesPlugin";
import { challengeBlock } from "../challenges/block";
import { challengeToToml } from "../challenges/schema";
import { comDangerBlock } from "../comDangers/block";
import { comDangerToToml } from "../comDangers/schema";
import { themeCardBlock } from "../themeCards/block";
import { themeCardToToml } from "../themeCards/toml";
import {
	describeMissingPart,
	loadCopyAsTomlCommand,
	TomlExport,
} from "./copyAsToml";

/**
 * Every block that can leave the note as a schema-in-the-mist document.
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
];

export function loadTomlExportCommands(plugin: BrumesPlugin): void {
	for (const spec of TOML_EXPORTS) {
		loadCopyAsTomlCommand(plugin, spec);
	}
}
