import { Editor, Menu, MenuItem } from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";
import { findGameRegistration, gamePackClass } from "../../games/registry";
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
import { osCharacterTropeBlock, osLoadoutItemBlock } from "../osCharacterCreation/block";
import { adrenalinePjBlock } from "../adrenalinePj/block";
import { adrenalinePnjBlock } from "../adrenalinePnj/block";
import { adrenalineMonsterBlock } from "../adrenalineMonstre/block";
import { pbtaMoveBlock, pbtaPlaybookBlock } from "../pbta/block";
import {
	tomlExportForBlock,
} from "./tomlExports";
import { rememberRenderedTomlContext } from "./pasteToml";

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
	osCharacterTropeBlock,
	osLoadoutItemBlock,
	adrenalinePjBlock,
	adrenalinePnjBlock,
	adrenalineMonsterBlock,
	pbtaPlaybookBlock,
	pbtaMoveBlock,
];

function requiredCapabilities(settings: BrumesSettings): readonly string[] {
	return findGameRegistration(settings.mode)?.installation?.requires ?? [];
}

export function isAvailableBlock(
	block: BrumesBlock<unknown>,
	settings: BrumesSettings,
): boolean {
	return isBlockEnabled(block, settings, requiredCapabilities(settings));
}

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

				if (!isAvailableBlock(block, plugin.settings)) {
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
				el.classList.add(BLOCK_SCOPE_CLASS, gamePackClass(plugin.settings.mode));
				const rendered = block.render(parsed, el.doc, {
					packId: plugin.settings.mode,
					resolveImage: (path) => {
						const file = plugin.app.metadataCache.getFirstLinkpathDest(path, ctx.sourcePath);
						return file && /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(file.path)
							? plugin.app.vault.getResourcePath(file)
							: null;
					},
				});
				el.appendChild(rendered);
				// Older Obsidian builds render the block but do not expose section
				// metadata. The context menu must still be usable (and visible).
				const section = typeof ctx.getSectionInfo === "function"
					? ctx.getSectionInfo(el)
					: null;
				const spec = tomlExportForBlock(block);
				if (spec?.sourceTarget) {
					const rememberRightClick = (event: MouseEvent) => {
						if (event.button !== 2 && (event.buttons & 2) === 0) return;
						rememberRenderedTomlContext(plugin, {
							sourcePath: ctx.sourcePath,
							section,
							renderedSource: source,
							spec,
						});
					};
					el.addEventListener("pointerdown", rememberRightClick, { capture: true });
					el.addEventListener("mousedown", rememberRightClick, { capture: true });
				}
			});
		}
	}
}

export function hasBlockInsertions(settings: BrumesSettings): boolean {
	return BRUMES_BLOCKS.some((block) => isAvailableBlock(block, settings));
}

export function contributeBlockInsertions(
	menu: Menu,
	editor: Editor,
	settings: BrumesSettings,
): number {
	let added = 0;

	for (const block of BRUMES_BLOCKS) {
		if (!isAvailableBlock(block, settings)) {
			continue;
		}

		menu.addItem((item: MenuItem) =>
			item
				.setTitle(block.label)
				.setIcon(block.icon)
				.onClick(() =>
					editor.replaceRange(block.template(settings), editor.getCursor()),
				),
		);
		added++;
	}

	return added;
}
