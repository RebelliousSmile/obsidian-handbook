import { RollerData } from "./parser";

export function renderRoller(data: RollerData, doc: Document): HTMLElement {
	const root = doc.createElement("div");
	root.classList.add("brumes-roller");
	const table = doc.createElement("table");
	table.classList.add("brumes-roller--table");
	const head = doc.createElement("thead");
	const headerRow = doc.createElement("tr");
	for (const value of data.table.headers) {
		const cell = doc.createElement("th");
		cell.scope = "col";
		cell.textContent = value;
		headerRow.appendChild(cell);
	}
	head.appendChild(headerRow);
	table.appendChild(head);
	const body = doc.createElement("tbody");
	for (const row of data.table.rows) {
		const rowEl = doc.createElement("tr");
		for (const value of row) {
			const cell = doc.createElement("td");
			cell.textContent = value;
			rowEl.appendChild(cell);
		}
		body.appendChild(rowEl);
	}
	table.appendChild(body);
	root.appendChild(table);
	return root;
}
