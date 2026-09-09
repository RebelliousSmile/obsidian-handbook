import { Editor, Menu, MenuItem } from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";
import { gamePackClass } from "../../games/registry";
import { BrumesSettings } from "../../settings/types";
import { logScope } from "../../utils/logger";
import { renderRawBlock } from "./fallback";
import { BrumesBlock, blockIds, isBlockEnabled } from "./types";
import { challengeBlock } from "../challenges/block";
import { comDangerBlock } from "../comDangers/block";
import { comThemeCardBlock } from "../comThemeCards/block";
import { journeyBlock } from "../journeys/block";
import { themeCardBlock } from "../themeCards/block";
import { themeKitBlock } from "../themeKits/block";
import { BLOCK_SCOPE_CLASS } from "../modes/domModeClass";
import { osThemeBlock, osThemeKitBlock } from "../osThemes/block";
import { osChallengeBlock, osPowerSetBlock } from "../osChallenges/block";

const log = logScope("Blocks");

/** Every fenced block Brumes knows. Adding a format means adding a line here. */
export const BRUMES_BLOCKS: BrumesBlock<unknown>[] = [
	themeCardBlock,
	challengeBlock,
	journeyBlock,
	themeKitBlock,
	comThemeCardBlock,
	comDangerBlock,
	osThemeBlock,
	osThemeKitBlock,
	osChallengeBlock,
	osPowerSetBlock,
];

/**
 * A shape names the block it describes, so that it can be resolved without the
 * registry in hand. The two spellings are checked against each other here,
 * once, rather than trusted: an override file names a block by its id, and a
 * shape that answers to another name would silently ignore it.
 */
function checkShapeIds(): void {
	for (const block of BRUMES_BLOCKS) {
		if (block.shape.block !== block.id) {
			log.warn(
				`The shape of "${block.id}" says it describes "${block.shape.block}"; overrides written for it will not be found.`,
			);
		}
	}
}

/** Deprecated ids already reported, so an alias warns once per session. */
const warnedAliases = new Set<string>();

export function loadBrumesBlocks(plugin: BrumesPlugin): void {
	checkShapeIds();

	for (const block of BRUMES_BLOCKS) {
		for (const id of blockIds(block)) {
			plugin.registerMarkdownCodeBlockProcessor(id, (source, el, ctx) => {
				if (id !== block.id && !warnedAliases.has(id)) {
					warnedAliases.add(id);
					log.warn(
						`The "${id}" block is deprecated, use "${block.id}" instead.`,
					);
				}

				if (!isBlockEnabled(block, plugin.settings)) {
					renderRawBlock(source, el, id);
					return;
				}

				const parsed = block.parse(source);

				if (parsed === null) {
					log.warn(`Invalid ${id} block in file`, ctx.sourcePath);
					const error = el.doc.createElement("pre");
					error.textContent = `Invalid ${id} block.`;
					el.appendChild(error);
					return;
				}

				log.debug(`Rendering ${id}:`, parsed);
				el.classList.add(BLOCK_SCOPE_CLASS, gamePackClass(block.mode));
				el.appendChild(block.render(parsed, el.doc));
			});
		}
	}
}

export function hasBlockInsertions(settings: BrumesSettings): boolean {
	return BRUMES_BLOCKS.some((block) => isBlockEnabled(block, settings));
}

export function contributeBlockInsertions(
	menu: Menu,
	editor: Editor,
	settings: BrumesSettings,
): number {
	let added = 0;

	for (const block of BRUMES_BLOCKS) {
		if (!isBlockEnabled(block, settings)) {
			continue;
		}

		menu.addItem((item: MenuItem) =>
			item
				.setTitle(block.label)
				.setIcon(block.icon)
				.onClick(() =>
					editor.replaceRange(block.template(), editor.getCursor()),
				),
		);
		added++;
	}

	return added;
}
