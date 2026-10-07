import type { MarkdownPostProcessorContext } from "obsidian";
import { TFile } from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";
import { mapPrintRegions } from "../layoutRegions/printMapper";
import { warnOnce } from "../layoutRegions/warnOnce";
import { isModeOffered, modeSectionClass, parseModeSections } from "./parser";

/**
 * With `printerFriendly` on, the paper is light whatever the screen shows and
 * a dark layer only exists under `@media screen`: a section class would be
 * inert, so none is applied. Off, the sections are kept as authored.
 *
 * The print DOM carries neither source lines nor markers, so the sections are
 * joined to it by rank, as the layout regions are.
 */
export async function printModeSections(
	plugin: BrumesPlugin,
	element: HTMLElement,
	context: MarkdownPostProcessorContext,
): Promise<void> {
	if (plugin.settings.printerFriendly) return;
	const file = plugin.app.vault.getAbstractFileByPath(context.sourcePath);
	if (!(file instanceof TFile)) return;

	const source = await plugin.app.vault.cachedRead(file);
	const parsed = parseModeSections(source);
	const offered = plugin.effectivePolarities();
	const published = plugin.publishesSection();
	const sections = parsed.sections.filter((section) => isModeOffered(section.mode, offered, published));
	if (sections.length === 0) return;

	const cache = (plugin.app.metadataCache.getFileCache(file)?.sections ?? []).map((section) => ({
		type: section.type,
		lineStart: section.position.start.line,
		lineEnd: section.position.end.line,
	}));
	const mapped = mapPrintRegions(
		sections,
		cache,
		source.split(/\r?\n/),
		Array.from(element.children) as HTMLElement[],
	);
	if (!mapped.ok) {
		warnOnce(context.sourcePath, `Mode sections left unforced in the PDF export: ${mapped.reason}.`);
		return;
	}
	for (const section of mapped.unmatched) {
		warnOnce(
			context.sourcePath,
			`Mode section at source line ${section.openLine + 1} left unforced in the PDF export: its blocks are not contiguous.`,
		);
	}
	for (const { region, blocks } of mapped.selections) {
		for (const block of blocks) block.classList.add(modeSectionClass(region.mode));
	}
}
