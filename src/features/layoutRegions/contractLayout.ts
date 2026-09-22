import { wrapBlocksInColumns } from "./sectionMapper";

/** A layout published by a schema: never inferred from a document's source. */
export interface ContractLayout {
	/** Complete canonical order of regions the consumer may rearrange. */
	regions: readonly string[];
	/** Ordered region ids for each wide-screen column. */
	columns: readonly (readonly string[])[];
}

/**
 * Applies a schema layout to direct rendered regions. Missing optional regions
 * are ignored; every published but unassigned region follows the grid in its
 * canonical order. Source Markdown is never read or changed here.
 */
export function applyContractLayout(parent: HTMLElement, layout: ContractLayout): HTMLElement | null {
	const wanted = new Set(layout.regions);
	const byRegion = new Map<string, HTMLElement>();
	for (const child of Array.from(parent.children) as HTMLElement[]) {
		const region = child.dataset.region;
		if (!region || !wanted.has(region)) continue;
		if (byRegion.has(region)) return null;
		byRegion.set(region, child);
	}

	const assigned = new Set(layout.columns.reduce<string[]>((all, column) => all.concat(column), []));
	const columns = layout.columns
		.map((column) => column.map((region) => byRegion.get(region)).filter((element): element is HTMLElement => element !== undefined))
		.filter((column) => column.length > 0);
	if (columns.length === 0) return null;

	const unassigned = layout.regions
		.filter((region) => !assigned.has(region))
		.map((region) => byRegion.get(region))
		.filter((element): element is HTMLElement => element !== undefined);
	const first = columns[0][0];
	const container = wrapBlocksInColumns(first, columns);
	for (const region of unassigned) parent.appendChild(region);
	return container;
}
