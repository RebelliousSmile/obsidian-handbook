import {
	MarkdownPostProcessor,
	MarkdownPostProcessorContext,
} from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";
import { isPrintExport } from "../layoutRegions/printProcessor";
import { printModeSections } from "./printProcessor";
import { warnOnce } from "../layoutRegions/warnOnce";
import {
	ModeSectionParseResult,
	ModeSectionMode,
	isModeOffered,
	modeSectionClass,
	sectionOfBlock,
	parseModeSections,
} from "./parser";

const NO_SECTION: ModeSectionParseResult = { diagnostics: [], sections: [] };
const MODES: readonly ModeSectionMode[] = ["light", "dark", "alternate"];
const sourceByParent = new WeakMap<HTMLElement, { text: string; parsed: ModeSectionParseResult }>();
const observers = new WeakMap<HTMLElement, { context: MarkdownPostProcessorContext }>();

export function modeSectionsPostProcessor(plugin: BrumesPlugin): MarkdownPostProcessor {
	return (element, context) => {
		// The export re-applies classes by rank, once the setting says it is wanted.
		if (isPrintExport(element, context)) return printModeSections(plugin, element, context);
		if (!context.getSectionInfo(element)) return;
		const process = (attempt: number) => {
			const parent = element.parentElement;
			if (!parent) {
				if (attempt < 20) element.win.setTimeout(() => process(attempt + 1), 50);
				return;
			}
			if (!parent.classList.contains("markdown-preview-section")) return;
			observeBlocks(plugin, parent, context);
			markBlocks(plugin, parent, context);
		};
		process(0);
	};
}

/**
 * Mark every rendered block of a section, in place. Obsidian keeps only the
 * sections near the viewport in the DOM and owns their order, so a section is
 * never wrapped: its blocks are adopted one by one as they are drawn.
 */
function markBlocks(
	plugin: BrumesPlugin,
	parent: HTMLElement,
	context: MarkdownPostProcessorContext,
): void {
	let parsed: ModeSectionParseResult | null = null;
	const offered = plugin.effectivePolarities();
	const published = plugin.publishesSection();
	const blocks = Array.from(parent.children) as HTMLElement[];
	// The mode shared by every block of the host, when there is one.
	let shared: ModeSectionMode | null | undefined;
	for (const block of blocks) {
		const info = context.getSectionInfo(block);
		if (info && !parsed) parsed = sourceSections(context, parent, info.text, offered, published);
		const section = sectionOfBlock((parsed ?? NO_SECTION).sections, info);
		for (const mode of MODES) {
			// A mode the pack cannot honour is never applied.
			block.classList.toggle(
				modeSectionClass(mode),
				section?.mode === mode && isModeOffered(mode, offered, published),
			);
		}
		const applied = section && isModeOffered(section.mode, offered, published) ? section.mode : null;
		// A block without source lines says nothing about the host.
		if (info) shared = shared === undefined || shared === applied ? applied : null;
	}
	// The host wears the band only when all its blocks lie in the section. A
	// note flowing in columns paints its sectioned blocks one by one: painting
	// the host would carry the section past its closing marker.
	const hosted = shared ?? null;
	for (const mode of MODES) {
		parent.classList.toggle(modeSectionClass(mode), hosted === mode);
	}
}

function sourceSections(
	context: MarkdownPostProcessorContext,
	parent: HTMLElement,
	sourceText: string,
	offered: readonly ModeSectionMode[],
	published: boolean,
): ModeSectionParseResult {
	const existing = sourceByParent.get(parent);
	let parsed = existing?.text === sourceText ? existing.parsed : null;
	if (!parsed) {
		parsed = parseModeSections(sourceText);
		sourceByParent.set(parent, { text: sourceText, parsed });
		for (const diagnostic of parsed.diagnostics) {
			warnOnce(
				context.sourcePath,
				`Ignored invalid mode directive at source line ${diagnostic.line + 1}: ${diagnostic.reason}.`,
			);
		}
	}
	for (const section of parsed.sections) {
		if (!isModeOffered(section.mode, offered, published)) {
			warnOnce(
				context.sourcePath,
				`Mode section at source line ${section.openLine + 1} ignored: the active game does not offer a ${section.mode} mode.`,
			);
		}
	}
	return parsed;
}

/**
 * A section drawn later, or shifted by an edit elsewhere in the note, is marked
 * as it arrives: Obsidian does not run post-processors again on the sections an
 * edit left untouched.
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
	const observer = new MutationObserver((records) => {
		const target = records[0]?.target;
		if (!target || !target.instanceOf(HTMLElement)) return;
		const state = observers.get(target);
		if (state) markBlocks(plugin, target, state.context);
	});
	observer.observe(parent, { childList: true });
	plugin.register(() => observer.disconnect());
}
