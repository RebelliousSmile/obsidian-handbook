import { el } from "./motwShared";

/** The six segments the Sprawl prints for an hour track; the contract caps `hoursMarked` at the same number. */
export const SPRAWL_HOUR_SEGMENTS = 6;

export function signed(value: number): string {
	return value > 0 ? `+${value}` : String(value);
}

/** One hexagon per entry: the printed name, then the value written in it. A missing value is left blank. */
export function hexagons(doc: Document, entries: ReadonlyArray<readonly [string, string | undefined]>): HTMLElement {
	const list = el(doc, "ul");
	for (const [label, value] of entries) {
		const item = el(doc, "li");
		item.appendChild(el(doc, "span", label));
		item.appendChild(el(doc, "strong", value ?? ""));
		list.appendChild(item);
	}
	return list;
}

/** A track of hours: every segment is drawn once, the first `marked` of them are marked. */
export function hourTrack(doc: Document, label: string, marked: number | undefined): HTMLElement {
	const list = el(doc, "ol");
	list.setAttribute("aria-label", label);
	const count = Math.min(marked ?? 0, SPRAWL_HOUR_SEGMENTS);
	for (let index = 1; index <= SPRAWL_HOUR_SEGMENTS; index += 1) {
		const item = el(doc, "li");
		item.dataset.marked = index <= count ? "true" : "false";
		item.setAttribute("aria-label", `${label} ${index}`);
		list.appendChild(item);
	}
	return list;
}
