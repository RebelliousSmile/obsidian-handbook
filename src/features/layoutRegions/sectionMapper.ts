import type { LayoutRegion } from "./parser";

/** Anything that covers a run of source lines. */
export interface LineSpan {
	lineStart: number;
	lineEnd: number;
}

export interface SourceBlock<T> {
	block: T;
	info: { lineStart: number; lineEnd: number } | null;
}

/** Select a contiguous run of complete rendered blocks inside the directive. */
export function mapRegionToBlocks(
	region: LineSpan,
	blocks: readonly SourceBlock<HTMLElement>[],
): readonly HTMLElement[] | null {
	const selected = blocks.filter(({ info }) =>
		info && info.lineStart <= region.lineEnd && info.lineEnd >= region.lineStart,
	);
	if (!selected.length) return null;
	if (selected[0].info?.lineStart !== region.lineStart || selected[selected.length - 1].info?.lineEnd !== region.lineEnd) return null;
	if (selected.some(({ info }) => !info || info.lineStart < region.lineStart || info.lineEnd > region.lineEnd)) return null;
	const start = blocks.indexOf(selected[0]);
	const end = blocks.indexOf(selected[selected.length - 1]);
	if (end - start + 1 !== selected.length) return null;
	return selected.map(({ block }) => block);
}

/** Class of a rendered block that flows in the columns of its region. */
export const FLOW_BLOCK = "handbook-layout-flow";
export const MARKER_BLOCK = "handbook-layout-marker";
/** A section holding only a marker comment: no element, no text, and no inline style such as a page break. */
export function isMarkerBlock(block: HTMLElement): boolean {
	return block.childElementCount === 0 && (block.textContent ?? "").trim() === "" && !block.hasAttribute("style");
}

/** Class of the block container once it is the column box of its regions. */
export const FLOW_HOST = "handbook-layout-flowing";

/**
 * The column count the regions of one note flow in. A single column box holds
 * every region of the note, so the first multi-column region decides.
 */
export function flowColumns(regions: readonly LayoutRegion[]): number | null {
	for (const region of regions) {
		if (region.columns > 1) return region.columns;
	}
	return null;
}

/** Whether a rendered block lies entirely inside a multi-column region. */
export function flowsInRegion(
	regions: readonly LayoutRegion[],
	info: { lineStart: number; lineEnd: number } | null,
): boolean {
	if (!info) return false;
	return regions.some((region) =>
		region.columns > 1 && info.lineStart >= region.lineStart && info.lineEnd <= region.lineEnd,
	);
}

/** Wrap explicit groups of rendered blocks; contract layouts do not need headings or source markers. */
export function wrapBlocksInColumns(first: HTMLElement, columns: readonly (readonly HTMLElement[])[]): HTMLElement {
	const container = first.ownerDocument.createElement("div");
	container.classList.add("handbook-layout-region");
	container.style.setProperty("--handbook-layout-columns", String(columns.length));
	first.before(container);
	for (const blocks of columns) {
		const column = first.ownerDocument.createElement("div");
		column.classList.add("handbook-layout-column");
		container.appendChild(column);
		for (const block of blocks) column.appendChild(block);
	}
	return container;
}
