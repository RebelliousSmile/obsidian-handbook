import type { LayoutRegion } from "./parser";

export interface SourceBlock<T> {
	block: T;
	info: { lineStart: number; lineEnd: number } | null;
}

/** Select a contiguous run of complete rendered blocks inside the directive. */
export function mapRegionToBlocks(
	region: LayoutRegion,
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

export function wrapBlocksInRegion(
	blocks: readonly HTMLElement[],
	columns: number,
): HTMLElement | null {
	const first = blocks[0];
	if (!first) return null;

	const container = first.ownerDocument.createElement("div");
	container.classList.add("handbook-layout-region");
	container.style.setProperty("--handbook-layout-columns", String(columns));
	first.before(container);

	const headingLevel = blocks.map(blockHeadingLevel).find((level) => level !== null);
	let group: HTMLElement | null = null;
	let groupHasHeading = false;
	for (const block of blocks) {
		const level = blockHeadingLevel(block);
		if (!group || (groupHasHeading && level !== null && headingLevel != null && level <= headingLevel)) {
			group = first.ownerDocument.createElement("div");
			group.classList.add("handbook-layout-column");
			container.appendChild(group);
			groupHasHeading = false;
		}
		group.appendChild(block);
		if (level !== null) groupHasHeading = true;
	}
	return container;
}

function blockHeadingLevel(block: HTMLElement): number | null {
	const match = /^el-h([1-6])$/.exec(block.className);
	return match ? Number(match[1]) : null;
}
