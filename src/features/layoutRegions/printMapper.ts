import type { LayoutRegion } from "./parser";
import { mapRegionToBlocks, SourceBlock } from "./sectionMapper";

/** A block of the note as Obsidian's metadata cache lists it. */
export interface CacheSection {
	type: string;
	lineStart: number;
	lineEnd: number;
}

export type PrintMapResult =
	| { ok: true; selections: readonly PrintSelection[]; unmatched: readonly LayoutRegion[] }
	| { ok: false; reason: string };

export interface PrintSelection {
	region: LayoutRegion;
	blocks: readonly HTMLElement[];
}

const COMMENT_ONLY = /^(?:<!--[\s\S]*?-->\s*)+$/;
const HEADING_TAG = /^H[1-6]$/;

/**
 * The print DOM carries neither source lines nor markers: one bare wrapper per
 * source block, comments dropped, an optional direct title first. The blocks
 * are joined to the metadata cache by rank, and only when every block up to
 * the last region agrees on its kind; otherwise nothing is selected.
 */
export function mapPrintRegions(
	regions: readonly LayoutRegion[],
	cacheSections: readonly CacheSection[],
	sourceLines: readonly string[],
	printed: readonly HTMLElement[],
): PrintMapResult {
	const children = printed[0]?.tagName === "H1" ? printed.slice(1) : printed;
	let sections = cacheSections.filter((section) => !isCommentOnly(section, sourceLines));
	if (sections[0]?.type === "yaml" && !children[0]?.classList.contains("mod-frontmatter")) {
		sections = sections.slice(1);
	}

	const limit = regions.reduce((last, region) => Math.max(last, region.lineEnd), -1);
	const covered = sections.filter((section) => section.lineStart <= limit).length;
	if (children.length < covered) {
		return { ok: false, reason: `${children.length} printed blocks for ${covered} source blocks` };
	}
	for (let index = 0; index < covered; index++) {
		if (!agrees(sections[index], children[index])) {
			return {
				ok: false,
				reason: `printed block ${index + 1} (${children[index].tagName.toLowerCase()}) does not match source block "${sections[index].type}"`,
			};
		}
	}

	const blocks = children.map((block, index): SourceBlock<HTMLElement> => ({
		block,
		info: index < covered ? { lineStart: sections[index].lineStart, lineEnd: sections[index].lineEnd } : null,
	}));
	const selections: PrintSelection[] = [];
	const unmatched: LayoutRegion[] = [];
	for (const region of regions) {
		const selected = mapRegionToBlocks(region, blocks);
		if (selected) selections.push({ region, blocks: selected });
		else unmatched.push(region);
	}
	return { ok: true, selections, unmatched };
}

function isCommentOnly(section: CacheSection, lines: readonly string[]): boolean {
	if (section.type !== "html") return false;
	return COMMENT_ONLY.test(lines.slice(section.lineStart, section.lineEnd + 1).join("\n").trim());
}

/** The block itself, or the only child of the bare wrapper Obsidian puts around it. */
function content(block: HTMLElement): HTMLElement {
	const only = block.children.length === 1 ? block.children[0] : null;
	return block.tagName === "DIV" && block.className === "" && only ? (only as HTMLElement) : block;
}

function agrees(section: CacheSection, block: HTMLElement): boolean {
	const isHeading = HEADING_TAG.test(content(block).tagName);
	const isRule = block.tagName === "HR";
	const isFrontmatter = block.classList.contains("mod-frontmatter");
	switch (section.type) {
		case "heading": return isHeading;
		case "thematicBreak": return isRule;
		case "yaml": return isFrontmatter;
		case "html": return true;
		default: return !isHeading && !isRule && !isFrontmatter;
	}
}
