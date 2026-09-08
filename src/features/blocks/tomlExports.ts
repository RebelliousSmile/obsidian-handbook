import type BrumesPlugin from "../../BrumesPlugin";
import { challengeBlock } from "../challenges/block";
import { challengeToToml } from "../challenges/schema";
import { comDangerBlock } from "../comDangers/block";
import { comDangerToToml } from "../comDangers/schema";
import { themeCardBlock } from "../themeCards/block";
import { themeCardToToml } from "../themeCards/toml";
import { describeMissingPart, loadCopyAsTomlCommand } from "./copyAsToml";

/**
 * The blocks that can leave the note as a schema-in-the-mist document, and
 * only those: a journey and a theme kit have no shape upstream, so they have
 * nothing to be copied into.
 */
export function loadTomlExportCommands(plugin: BrumesPlugin): void {
	loadCopyAsTomlCommand(plugin, {
		block: themeCardBlock,
		commandId: "copy-theme-card-as-toml",
		noun: "theme card",
		toToml: themeCardToToml,
		describeFailure: (source) =>
			describeMissingPart(
				source,
				"it has no title tag, add a line such as {Title Tag}",
			),
	});

	loadCopyAsTomlCommand(plugin, {
		block: challengeBlock,
		commandId: "copy-challenge-as-toml",
		noun: "challenge",
		toToml: challengeToToml,
		describeFailure: (source) =>
			describeMissingPart(source, "it must open with the challenge name"),
	});

	loadCopyAsTomlCommand(plugin, {
		block: comDangerBlock,
		commandId: "copy-danger-as-toml",
		noun: "danger",
		toToml: comDangerToToml,
		describeFailure: (source) =>
			describeMissingPart(
				source,
				"it must open with the name and hold at least one section",
			),
	});
}
