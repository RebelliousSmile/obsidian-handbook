import type BrumesPlugin from "../../BrumesPlugin";
import { contributeRollerToEventMenu } from "./contextMenu";
import type { RollerData } from "./parser";

const ROLLER_CALLOUT = '.callout[data-callout="roller"]';

function cellTexts(row: Element, selector: string): string[] {
	const texts: string[] = [];
	for (const cell of Array.from(row.querySelectorAll(selector))) {
		texts.push((cell.textContent ?? "").trim());
	}
	return texts;
}

/**
 * A two-column table whose first header is a die (`d10`, `2d6`, `dice: 1d6`)
 * is looked up by the rolled value; any other table yields one row at random.
 */
function lookupFormula(headers: string[]): string | null {
	if (headers.length !== 2) return null;
	const explicit = /^dice\s*:\s*(.+)$/i.exec(headers[0]);
	if (explicit) return explicit[1].trim() || null;
	const bare = /^(\d*)d(\d+)$/i.exec(headers[0]);
	return bare ? `${bare[1] || "1"}d${bare[2]}` : null;
}

/** Read the rendered table of a roller callout, as the roller block reads its source. */
export function readRollerCalloutTable(table: Element): RollerData | null {
	const headerRow = table.querySelector("thead tr");
	if (!headerRow) return null;
	const headers = cellTexts(headerRow, "th");
	const rows: string[][] = [];
	for (const row of Array.from(table.querySelectorAll("tbody tr"))) {
		const cells = cellTexts(row, "td");
		if (cells.length === headers.length && cells.every((cell) => cell !== "")) {
			rows.push(cells);
		}
	}
	if (headers.length === 0 || rows.length === 0) return null;
	return { table: { headers, rows, lookupFormula: lookupFormula(headers) } };
}

/**
 * Offer the roll action on the table of every roller callout drawn in `doc`.
 * Capture runs before Obsidian fills the same event menu with the callout items.
 */
export function bindRollerCallouts(plugin: BrumesPlugin, doc: Document): void {
	plugin.registerDomEvent(doc, "contextmenu", (event: MouseEvent) => {
		if (!plugin.settings.features.roller) return;
		const target = event.target instanceof Element ? event.target : null;
		const table = target?.closest("table");
		if (!table || !table.closest(ROLLER_CALLOUT)) return;
		const data = readRollerCalloutTable(table);
		if (data) contributeRollerToEventMenu(plugin, data, event);
	}, true);
}
