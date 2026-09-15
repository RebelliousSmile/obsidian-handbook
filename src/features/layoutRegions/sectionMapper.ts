import type { LayoutRegion } from "./parser";

export interface SourceSection<T> {
	info: { lineEnd: number; lineStart: number };
	section: T;
}

/**
 * Selects one contiguous run of rendered sections only when it maps exactly
 * to a source interval. A partial or crossing section is unsafe to move.
 */
export function mapRegionToSections<T>(
	region: LayoutRegion,
	sections: readonly SourceSection<T>[],
): readonly T[] | null {
	const selected: { index: number; value: SourceSection<T> }[] = [];

	for (const [index, value] of sections.entries()) {
		if (!intersects(region, value.info)) continue;
		if (!isContained(region, value.info)) return null;
		selected.push({ index, value });
	}

	if (selected.length === 0) return null;
	if (!isContinuous(selected)) return null;

	const first = selected[0].value.info;
	const last = selected[selected.length - 1]?.value.info;
	if (first.lineStart !== region.lineStart || last?.lineEnd !== region.lineEnd) {
		return null;
	}

	return selected.map(({ value }) => value.section);
}

export function wrapSectionsInRegion(
	sections: readonly HTMLElement[],
	columns: number,
): HTMLElement | null {
	const first = sections[0];
	if (!first) return null;

	const container = first.ownerDocument.createElement("div");
	container.classList.add("handbook-layout-region");
	container.style.setProperty("--handbook-layout-columns", String(columns));
	first.before(container);
	for (const section of sections) container.appendChild(section);
	return container;
}

function intersects(
	region: LayoutRegion,
	section: { lineEnd: number; lineStart: number },
): boolean {
	return section.lineStart <= region.lineEnd && section.lineEnd >= region.lineStart;
}

function isContained(
	region: LayoutRegion,
	section: { lineEnd: number; lineStart: number },
): boolean {
	return section.lineStart >= region.lineStart && section.lineEnd <= region.lineEnd;
}

function isContinuous<T>(
	selected: readonly { index: number; value: SourceSection<T> }[],
): boolean {
	return selected.every(({ index }, selectedIndex) =>
		selectedIndex === 0 ? true : index === selected[selectedIndex - 1].index + 1,
	);
}
