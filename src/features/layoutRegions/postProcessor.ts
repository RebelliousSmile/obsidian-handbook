import {
	MarkdownPostProcessor,
	MarkdownPostProcessorContext,
	TFile,
} from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";
import { markPrintPageBreaks } from "../printPageBreaks";
import { LayoutRegionParseResult, parseLayoutRegions } from "./parser";
import { isPrintExport, printLayoutRegions } from "./printProcessor";
import { holdWholeNote, releaseWholeNote } from "./renderWindow";
import { FLOW_BLOCK, FLOW_HOST, flowColumns, flowsInRegion, isMarkerBlock, MARKER_BLOCK } from "./sectionMapper";
import { warnOnce } from "./warnOnce";

const NO_REGION: LayoutRegionParseResult = { diagnostics: [], regions: [] };
const sourceByParent = new WeakMap<HTMLElement, { text: string; parsed: LayoutRegionParseResult }>();
const observers = new WeakMap<HTMLElement, { context: MarkdownPostProcessorContext }>();

export function layoutRegionsPostProcessor(plugin: BrumesPlugin): MarkdownPostProcessor {
	return (element, context) => {
		if (isPrintExport(element, context)) {
			return printLayoutRegions(plugin, element, context)
				.then(() => markPrintPageBreaks(element));
		}

		if (!context.getSectionInfo(element)) return;
		const process = (attempt: number) => {
			const parent = element.parentElement;
			// Obsidian may invoke post-processors before it attaches a rendered
			// section. The source mapping is available now, but its DOM parent is not.
			if (!parent) {
				if (attempt < 20) element.win.setTimeout(() => process(attempt + 1), 50);
				return;
			}
			if (!parent.classList.contains("markdown-preview-section")) return;
			observeBlocks(plugin, parent, context);
			flowBlocks(plugin, parent, context);
		};
		process(0);
	};
}

/**
 * Mark every rendered block of a region, in place. Obsidian keeps only the
 * sections near the viewport in the DOM and owns their order, so a region is
 * never wrapped: its blocks are adopted one by one as they are drawn.
 */
function flowBlocks(
	plugin: BrumesPlugin,
	parent: HTMLElement,
	context: MarkdownPostProcessorContext,
): void {
	let parsed: LayoutRegionParseResult | null = null;
	for (const block of Array.from(parent.children) as HTMLElement[]) {
		const info = context.getSectionInfo(block);
		if (info && !parsed) parsed = sourceRegions(plugin, context, parent, info.text);
		block.classList.toggle(FLOW_BLOCK, flowsInRegion((parsed ?? NO_REGION).regions, info));
		// A section that only holds a marker comment draws nothing: it must not take a line of the column.
		block.classList.toggle(MARKER_BLOCK, isMarkerBlock(block));
	}
	// No block carries source lines: nothing is known, so nothing changes.
	if (!parsed) return;
	const columns = flowColumns(parsed.regions);
	if (columns === null) releaseWholeNote(parent);
	// A note whose sections cannot all be kept drawn stays in a single column.
	const flowing = columns !== null && holdWholeNote(plugin, parent);
	parent.classList.toggle(FLOW_HOST, flowing);
	if (flowing) parent.style.setProperty("--handbook-layout-columns", String(columns));
	else parent.style.removeProperty("--handbook-layout-columns");
}

function sourceRegions(
	plugin: BrumesPlugin,
	context: MarkdownPostProcessorContext,
	parent: HTMLElement,
	sourceText: string,
): LayoutRegionParseResult {
	const existing = sourceByParent.get(parent);
	if (existing?.text === sourceText) return existing.parsed;

	const file = plugin.app.vault.getAbstractFileByPath(context.sourcePath);
	if (!(file instanceof TFile)) return NO_REGION;

	const parsed = parseLayoutRegions(sourceText);
	sourceByParent.set(parent, { text: sourceText, parsed });
	for (const diagnostic of parsed.diagnostics) {
		warnOnce(
			context.sourcePath,
			`Ignored invalid layout directive at source line ${diagnostic.line + 1}: ${diagnostic.reason}.`,
		);
	}
	const columns = flowColumns(parsed.regions);
	for (const region of parsed.regions) {
		if (region.columns > 1 && region.columns !== columns) {
			warnOnce(
				context.sourcePath,
				`Layout region at source line ${region.openLine + 1} flows in ${columns} columns: the first region of a note sets the count.`,
			);
		}
	}
	return parsed;
}

/**
 * A section drawn later, or shifted by an edit elsewhere in the note, is marked
 * as it arrives. The observer outlives the section that started it: Obsidian
 * does not run post-processors again on the sections an edit left untouched.
 */
function observeBlocks(
	plugin: BrumesPlugin,
	parent: HTMLElement,
	context: MarkdownPostProcessorContext,
): void {
	const existing = observers.get(parent);
	if (existing) {
		existing.context = context;
		return;
	}

	observers.set(parent, { context });
	// The callback reads its target from the records: capturing `parent` here
	// would keep the view of a closed note alive until the plugin unloads.
	const observer = new MutationObserver((records) => {
		const target = records[0]?.target;
		if (!target || !target.instanceOf(HTMLElement)) return;
		const state = observers.get(target);
		if (state) flowBlocks(plugin, target, state.context);
	});
	observer.observe(parent, { childList: true });
	plugin.register(() => observer.disconnect());
}
