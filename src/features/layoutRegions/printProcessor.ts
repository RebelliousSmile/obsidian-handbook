import type { MarkdownPostProcessorContext } from "obsidian";
import { TFile } from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";
import { parseLayoutRegions } from "./parser";
import { mapPrintRegions } from "./printMapper";
import { FLOW_BLOCK, FLOW_HOST, MARKER_BLOCK, flowColumns, isMarkerBlock } from "./sectionMapper";
import { warnOnce } from "./warnOnce";

/**
 * Obsidian's PDF export renders the note into `.print > .markdown-preview-view`
 * and hands that container to post-processors with no section info.
 */
export function isPrintExport(element: HTMLElement, context: MarkdownPostProcessorContext): boolean {
	return element.classList.contains("markdown-preview-view")
		&& element.parentElement?.classList.contains("print") === true
		&& context.getSectionInfo(element) === null;
}

/** Resolves once the regions flow; the export waits for it before printing. */
export async function printLayoutRegions(
	plugin: BrumesPlugin,
	element: HTMLElement,
	context: MarkdownPostProcessorContext,
): Promise<void> {
	if (element.classList.contains(FLOW_HOST)) return;
	const file = plugin.app.vault.getAbstractFileByPath(context.sourcePath);
	if (!(file instanceof TFile)) return;

	const source = await plugin.app.vault.cachedRead(file);
	const parsed = parseLayoutRegions(source);
	for (const diagnostic of parsed.diagnostics) {
		warnOnce(
			context.sourcePath,
			`Ignored invalid layout directive at source line ${diagnostic.line + 1}: ${diagnostic.reason}.`,
		);
	}
	if (parsed.regions.length === 0) return;

	const sections = (plugin.app.metadataCache.getFileCache(file)?.sections ?? []).map((section) => ({
		type: section.type,
		lineStart: section.position.start.line,
		lineEnd: section.position.end.line,
	}));
	const mapped = mapPrintRegions(
		parsed.regions,
		sections,
		source.split(/\r?\n/),
		Array.from(element.children) as HTMLElement[],
	);
	if (!mapped.ok) {
		warnOnce(context.sourcePath, `Layout regions left ungrouped in the PDF export: ${mapped.reason}.`);
		return;
	}
	for (const region of mapped.unmatched) {
		warnOnce(
			context.sourcePath,
			`Layout region at source line ${region.openLine + 1} left ungrouped in the PDF export: its blocks are not contiguous.`,
		);
	}
	const columns = flowColumns(parsed.regions);
	if (columns === null) return;
	// Nothing is moved: the printed view becomes the column box and every block
	// outside a region spans it, exactly as in the reading view.
	element.classList.add(FLOW_HOST);
	element.style.setProperty("--handbook-layout-columns", String(columns));
	for (const { region, blocks } of mapped.selections) {
		if (region.columns <= 1) continue;
		for (const block of blocks) block.classList.add(FLOW_BLOCK);
	}
	// A block that only holds a marker comment draws nothing: it must not take a line of the column.
	for (const block of Array.from(element.children) as HTMLElement[]) {
		block.classList.toggle(MARKER_BLOCK, isMarkerBlock(block));
	}
}
