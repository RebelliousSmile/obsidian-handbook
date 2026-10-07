import type { MonsterheartsPlaybook } from "schema-pbta";
import contract from "schema-pbta/packs/monsterhearts/presentation-contract.json";

type RegionId = (typeof contract.regions)[number]["id"];
type Editorial = MonsterheartsPlaybook["editorial"]["opening"];
type MoveEntry = MonsterheartsPlaybook["moves"][number];

function el(doc: Document, tag: keyof HTMLElementTagNameMap, text?: string): HTMLElement {
	const result = doc.createElement(tag);
	if (text !== undefined) result.textContent = text;
	return result;
}

/** Region headings come from the published contract, never from literals here. */
function regionLabel(id: RegionId): string {
	return contract.regions.find((region) => region.id === id)?.label ?? id;
}

function section(doc: Document, id: RegionId, heading?: string): HTMLElement {
	const result = el(doc, "section");
	result.classList.add("handbook-monsterhearts-region");
	result.dataset.region = id;
	if (heading) result.appendChild(el(doc, "h3", heading));
	return result;
}

function checkbox(doc: Document, checked: boolean, label: string): HTMLElement {
	const input = el(doc, "input") as HTMLInputElement;
	input.type = "checkbox";
	input.checked = checked;
	input.setAttribute("aria-label", label);
	return input;
}

function editorial(doc: Document, id: RegionId, value: Editorial): HTMLElement {
	const result = section(doc, id, value.heading);
	for (const paragraph of value.paragraphs) result.appendChild(el(doc, "p", paragraph));
	return result;
}

function foldText(value: string): string {
	return value.toLocaleLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** A creation question is already in the booklet prose when most of its options appear there. */
function coveredByParagraphs(label: string[], paragraphs: readonly string[]): boolean {
	if (label.length < 2) return false;
	const text = foldText(paragraphs.join(" "));
	const found = label.filter((option) => text.includes(foldText(option))).length;
	return found * 2 >= label.length;
}

function list(doc: Document, values: readonly string[]): HTMLElement {
	const result = el(doc, "ul");
	for (const value of values) result.appendChild(el(doc, "li", value));
	return result;
}

function row(doc: Document, label: string, value: string | number): HTMLElement {
	const result = el(doc, "div");
	result.classList.add("handbook-monsterhearts-row");
	result.appendChild(el(doc, "dt", label));
	result.appendChild(el(doc, "dd", String(value)));
	return result;
}

function moveCard(doc: Document, move: MoveEntry, startingMoves: readonly string[]): HTMLElement {
	const card = el(doc, "article");
	card.classList.add("handbook-monsterhearts-move");
	const acquired = move.checked ?? ("ref" in move && startingMoves.includes(move.ref));
	card.dataset.acquired = String(acquired);
	const heading = el(doc, "h4");
	const symbol = el(doc, "span");
	symbol.classList.add("handbook-monsterhearts-move-symbol");
	symbol.setAttribute("aria-label", acquired ? "Action acquise" : "Action non acquise");
	heading.appendChild(symbol);
	heading.appendChild(el(doc, "span", "ref" in move ? move.ref : move.name));
	card.appendChild(heading);
	if ("ref" in move) return card;
	card.appendChild(el(doc, "p", move.description));
	if (move.trigger) card.appendChild(el(doc, "p", move.trigger));
	if (move.choices) card.appendChild(el(doc, "p", move.choices));
	if (move.roll) card.appendChild(el(doc, "p", `Jet : ${move.roll.rollType}${move.roll.rollMod === undefined ? "" : ` ${move.roll.rollMod >= 0 ? "+" : ""}${move.roll.rollMod}`}`));
	if (move.results) for (const key of Object.keys(move.results)) {
		const result = move.results[key];
		const outcome = el(doc, "p");
		outcome.appendChild(el(doc, "strong", `${result.label} : `));
		outcome.appendChild(el(doc, "span", result.text));
		card.appendChild(outcome);
	}
	return card;
}

function renderRegion(doc: Document, id: RegionId, data: MonsterheartsPlaybook, resolveImage?: (path: string) => string | null): HTMLElement | null {
	switch (id) {
		case "game-identity": {
			const result = section(doc, id);
			result.appendChild(el(doc, "h2", data.name));
			result.appendChild(el(doc, "p", data.description));
			return result;
		}
		case "monsterhearts-opening": return editorial(doc, id, data.editorial.opening);
		case "character-identity": {
			const result = section(doc, id, data.editorial.identity.heading);
			const paragraphs = data.editorial.identity.paragraphs;
			for (const paragraph of paragraphs) result.appendChild(el(doc, "p", paragraph));
			for (const question of data.creation ?? []) {
				const options = question.options.map((option) => typeof option === "string" ? option : option.label);
				if (coveredByParagraphs(options, paragraphs)) continue;
				result.appendChild(el(doc, "h4", question.label));
				result.appendChild(list(doc, options));
			}
			if (data.backstory?.length) {
				result.appendChild(el(doc, "h4", "Histoire"));
				result.appendChild(list(doc, data.backstory));
			}
			return result;
		}
		case "stat-profiles": {
			if (!Object.keys(data.stats).length && !data.statProfiles?.length) return null;
			const result = section(doc, id, regionLabel(id));
			const renderStats = (stats: Record<string, number>) => {
				const dl = el(doc, "dl");
				for (const name of Object.keys(stats)) {
					const value = stats[name];
					const bounds = data.statRanges?.[name];
					dl.appendChild(row(doc, name, bounds ? `${value} (${bounds.min}–${bounds.max})` : value));
				}
				return dl;
			};
			if (Object.keys(data.stats).length) result.appendChild(renderStats(data.stats));
			for (const profile of data.statProfiles ?? []) {
				const group = el(doc, "div");
				group.classList.add("handbook-monsterhearts-stat-profile");
				group.appendChild(el(doc, "h4", profile.label));
				group.appendChild(renderStats(profile.stats));
				result.appendChild(group);
			}
			if (data.statsDetail) result.appendChild(el(doc, "p", data.statsDetail));
			return result;
		}
		case "playbook-portrait": {
			const result = section(doc, id);
			const frame = el(doc, "figure");
			frame.classList.add("handbook-monsterhearts-portrait");
			const image = data.playbookImage?.trim();
			const source = image ? resolveImage?.(image) ?? (/^https:\/\//i.test(image) ? image : null) : null;
			if (source) {
				const img = el(doc, "img") as HTMLImageElement;
				img.src = source;
				img.alt = `Portrait de ${data.name}`;
				frame.appendChild(img);
			} else {
				frame.classList.add("handbook-monsterhearts-portrait--empty");
				frame.appendChild(el(doc, "span", "Portrait à ajouter"));
			}
			result.appendChild(frame);
			return result;
		}
		case "playbook-moves": {
			if (!data.moves.length) return null;
			const result = section(doc, id, regionLabel(id));
			for (const move of data.moves) result.appendChild(moveCard(doc, move, data.startingMoves ?? []));
			return result;
		}
		case "ascendants-and-conditions": {
				const hasStrings = data.strings !== undefined || !!data.ascendants?.length;
				if (!hasStrings && !data.conditions?.length && data.harm === undefined) return null;
				const result = section(doc, id, regionLabel(id));
				if (hasStrings) {
					result.appendChild(el(doc, "h4", "Ascendants"));
					if (data.strings) result.appendChild(el(doc, "p", `${data.strings.starting ?? 0} au départ · ${data.strings.max} maximum`));
					if (data.ascendants?.length) {
						const dl = el(doc, "dl");
						for (const item of data.ascendants) dl.appendChild(row(doc, item.name, item.value));
						result.appendChild(dl);
					}
				}
				if (data.harm !== undefined) {
					const harm = el(doc, "div");
					harm.classList.add("handbook-monsterhearts-harm");
					for (let index = 1; index <= 4; index += 1) harm.appendChild(checkbox(doc, index <= (data.harm ?? 0), `Dégât ${index}`));
					result.appendChild(harm);
				}
				for (const condition of data.conditions ?? []) {
					result.appendChild(el(doc, "h4", condition.name));
					if (condition.description) result.appendChild(el(doc, "p", condition.description));
				}
				return result;
			}
		case "gear": {
			if (!data.gear?.length) return null;
			const result = section(doc, id, regionLabel(id));
			result.appendChild(list(doc, data.gear.map((item) => `${item.name}${item.quantity ? ` × ${item.quantity}` : ""}${item.description ? ` — ${item.description}` : ""}`)));
			return result;
		}
		case "monsterhearts-darkest-self": return editorial(doc, id, data.editorial.darkestSelf);
		case "monsterhearts-sex-move": return editorial(doc, id, data.editorial.sexMove);
		case "monsterhearts-play": return data.editorial.play ? editorial(doc, id, data.editorial.play) : null;
		case "monsterhearts-progression": {
			const result = editorial(doc, id, data.editorial.progression);
			if (data.advances.length) {
				result.appendChild(el(doc, "h4", "Avancées"));
				const ul = el(doc, "ul");
				for (const advance of data.advances) {
					const item = el(doc, "li");
					item.appendChild(checkbox(doc, advance.checked === true, advance.label));
					item.appendChild(el(doc, "span", advance.label));
					ul.appendChild(item);
				}
				result.appendChild(ul);
			}
			return result;
		}
	}
	return null;
}

/** Region placement follows the published presentation contract. */
export function renderMonsterheartsLayout(data: MonsterheartsPlaybook, doc: Document, resolveImage?: (path: string) => string | null): HTMLElement {
	const root = el(doc, "article");
	root.classList.add("handbook-pbta-playbook", "handbook-monsterhearts-playbook");
	const rendered = new Map<RegionId, HTMLElement>();
	for (const id of contract.canonicalOrder) {
		const region = renderRegion(doc, id, data, resolveImage);
		if (region) rendered.set(id, region);
	}
	const identity = rendered.get("game-identity");
	if (identity) root.appendChild(identity);
	const placed = new Set<RegionId>(["game-identity"]);
	for (const [rowIndex, columns] of (contract.rows ?? []).entries()) {
		const layoutRow = el(doc, "div");
		layoutRow.classList.add("handbook-monsterhearts-layout-row");
		layoutRow.dataset.row = String(rowIndex + 1);
		for (const [columnIndex, ids] of columns.entries()) {
			const column = el(doc, "div");
			column.classList.add("handbook-monsterhearts-column");
			column.dataset.column = String(columnIndex + 1);
			for (const id of ids) {
				const region = rendered.get(id);
				if (region) column.appendChild(region);
				placed.add(id);
			}
			layoutRow.appendChild(column);
		}
		root.appendChild(layoutRow);
	}
	for (const id of contract.canonicalOrder) if (!placed.has(id)) {
		const region = rendered.get(id);
		if (region) root.appendChild(region);
	}
	return root;
}
