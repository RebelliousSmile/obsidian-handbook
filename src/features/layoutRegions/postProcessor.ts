import {
	MarkdownPostProcessor,
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
	TFile,
} from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";
import { LayoutRegion, LayoutRegionParseResult, parseLayoutRegions } from "./parser";
import { isPrintExport, printLayoutRegions } from "./printProcessor";
import { mapRegionToBlocks, SourceBlock, wrapBlocksInRegion } from "./sectionMapper";
import { warnOnce } from "./warnOnce";

const sourceByParent = new WeakMap<HTMLElement, { text: string; parsed: LayoutRegionParseResult }>();
const pendingRegions = new WeakMap<HTMLElement, Map<number, number>>();
const observers = new WeakMap<HTMLElement, { context: MarkdownPostProcessorContext; regions: readonly LayoutRegion[] }>();

export function layoutRegionsPostProcessor(plugin: BrumesPlugin): MarkdownPostProcessor {
	return (element, context) => {
		if (isPrintExport(element, context)) return printLayoutRegions(plugin, element, context);

		const sectionInfo = context.getSectionInfo(element);
		if (!sectionInfo) return;
		const process = (attempt: number) => {
			const parent = element.parentElement;
			// Obsidian may invoke post-processors before it attaches a rendered
			// section. The source mapping is available now, but its DOM parent is not.
			if (!parent) {
				if (attempt < 20) element.win.setTimeout(() => process(attempt + 1), 50);
				return;
			}
			if (!parent.classList.contains("markdown-preview-section")) return;
			const parsed = sourceRegions(plugin, context, parent, sectionInfo.text);
			observeRegions(parent, context, parsed.regions);
			for (const region of parsed.regions) {
				if (sectionInfo.lineStart === region.closeLine && sectionInfo.lineEnd === region.closeLine) {
					scheduleRegion(parent, context, region);
				}
			}
		};
		process(0);
	};
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
	if (!(file instanceof TFile)) return { diagnostics: [], regions: [] };

	const parsed = parseLayoutRegions(sourceText);
	sourceByParent.set(parent, { text: sourceText, parsed });
	for (const diagnostic of parsed.diagnostics) {
		warnOnce(
			context.sourcePath,
			`Ignored invalid layout directive at source line ${diagnostic.line + 1}: ${diagnostic.reason}.`,
		);
	}
	return parsed;
}

function observeRegions(
	parent: HTMLElement,
	context: MarkdownPostProcessorContext,
	regions: readonly LayoutRegion[],
): void {
	const existing = observers.get(parent);
	if (existing) {
		existing.context = context;
		existing.regions = regions;
		const active = new Set(regions.map((region) => region.openLine));
		for (const [line, timer] of pendingRegions.get(parent) ?? []) {
			if (active.has(line)) continue;
			parent.win.clearTimeout(timer);
			pendingRegions.get(parent)?.delete(line);
		}
		return;
	}
	if (regions.length === 0) return;

	const state = { context, regions };
	const observer = new MutationObserver(() => {
		for (const region of state.regions) scheduleRegion(parent, state.context, region);
	});
	observer.observe(parent, { childList: true });
	observers.set(parent, state);
	context.addChild(new RegionObserverChild(parent, observer));
}

function scheduleRegion(
	parent: HTMLElement,
	context: MarkdownPostProcessorContext,
	region: LayoutRegion,
): void {
	if (hasRegion(parent, region)) return;
	const pending = pendingRegions.get(parent) ?? new Map<number, number>();
	const existing = pending.get(region.openLine);
	if (existing !== undefined) parent.win.clearTimeout(existing);
	pending.set(region.openLine, parent.win.setTimeout(() => {
		pending.delete(region.openLine);
		if (!parent.isConnected || hasRegion(parent, region)) return;
		const rendered = Array.from(parent.children).map((block): SourceBlock<HTMLElement> => ({
			block: block as HTMLElement,
			info: context.getSectionInfo(block as HTMLElement),
		}));
		const blocks = mapRegionToBlocks(region, rendered);
		if (!blocks) return;
		const wrapped = wrapBlocksInRegion(blocks, region.columns);
		if (wrapped) wrapped.dataset.openLine = String(region.openLine);
	}, 500));
	pendingRegions.set(parent, pending);
}

function hasRegion(parent: HTMLElement, region: LayoutRegion): boolean {
	return parent.querySelector(`:scope > .handbook-layout-region[data-open-line="${region.openLine}"]`) !== null;
}

class RegionObserverChild extends MarkdownRenderChild {

	constructor(containerEl: HTMLElement, private readonly observer: MutationObserver) {
		super(containerEl);
	}

	onunload(): void {
		this.observer.disconnect();
		observers.delete(this.containerEl);
		for (const timer of pendingRegions.get(this.containerEl)?.values() ?? []) {
			this.containerEl.win.clearTimeout(timer);
		}
		pendingRegions.delete(this.containerEl);
	}
}
