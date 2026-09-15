import {
	MarkdownPostProcessor,
	MarkdownPostProcessorContext,
	TFile,
} from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";
import { logScope } from "../../utils/logger";
import { LayoutRegion, parseLayoutRegions } from "./parser";
import {
	mapRegionToSections,
	SourceSection,
	wrapSectionsInRegion,
} from "./sectionMapper";

const log = logScope("Layout regions");
const processedRegions = new WeakMap<HTMLElement, Set<string>>();
const sourceByParent = new WeakMap<HTMLElement, Promise<readonly LayoutRegion[]>>();
const warnedSources = new Set<string>();

export function layoutRegionsPostProcessor(
	plugin: BrumesPlugin,
): MarkdownPostProcessor {
	return async (element, context) => {
		if (!element.classList.contains("markdown-preview-section")) return;

		const parent = element.parentElement;
		if (!parent) return;

		const sectionInfo = context.getSectionInfo(element);
		if (!sectionInfo) return;

		const regions = await sourceRegions(plugin, context, parent);
		const region = regions.find(
			(candidate) =>
				sectionInfo.lineStart >= candidate.lineStart &&
				sectionInfo.lineEnd === candidate.lineEnd,
		);
		if (!region || isProcessed(parent, region)) return;

		const sections = sourceSections(parent, context);
		if (!sections) return;

		const mapped = mapRegionToSections(region, sections);
		if (!mapped) {
			warnOnce(
				context.sourcePath,
				`Could not map layout region ${region.lineStart}-${region.lineEnd}; keeping its sections unchanged.`,
			);
			return;
		}

		if (!wrapSectionsInRegion(mapped, region.columns)) return;
		markProcessed(parent, region);
	};
}

async function sourceRegions(
	plugin: BrumesPlugin,
	context: MarkdownPostProcessorContext,
	parent: HTMLElement,
): Promise<readonly LayoutRegion[]> {
	const existing = sourceByParent.get(parent);
	if (existing) return existing;

	const source = readSourceRegions(plugin, context);
	sourceByParent.set(parent, source);
	return source;
}

async function readSourceRegions(
	plugin: BrumesPlugin,
	context: MarkdownPostProcessorContext,
): Promise<readonly LayoutRegion[]> {
	const file = plugin.app.vault.getAbstractFileByPath(context.sourcePath);
	if (!(file instanceof TFile)) return [];

	const parsed = parseLayoutRegions(await plugin.app.vault.cachedRead(file));
	for (const diagnostic of parsed.diagnostics) {
		warnOnce(
			context.sourcePath,
			`Ignored invalid layout directive at source line ${diagnostic.line + 1}: ${diagnostic.reason}.`,
		);
	}
	return parsed.regions;
}

function sourceSections(
	parent: HTMLElement,
	context: MarkdownPostProcessorContext,
): readonly SourceSection<HTMLElement>[] | null {
	const sections = Array.from(
		parent.querySelectorAll<HTMLElement>(
			":scope > .markdown-preview-section",
		),
	);
	const mapped: SourceSection<HTMLElement>[] = [];

	for (const section of sections) {
		const info = context.getSectionInfo(section);
		if (!info) return null;
		mapped.push({ info, section });
	}

	return mapped;
}

function isProcessed(parent: HTMLElement, region: LayoutRegion): boolean {
	return processedRegions.get(parent)?.has(regionKey(region)) ?? false;
}

function markProcessed(parent: HTMLElement, region: LayoutRegion): void {
	const regions = processedRegions.get(parent) ?? new Set<string>();
	regions.add(regionKey(region));
	processedRegions.set(parent, regions);
}

function regionKey(region: LayoutRegion): string {
	return `${region.lineStart}:${region.lineEnd}`;
}

function warnOnce(sourcePath: string, message: string): void {
	const key = `${sourcePath}:${message}`;
	if (warnedSources.has(key)) return;
	warnedSources.add(key);
	log.warn(message, sourcePath);
}
