import { renderProse } from "../blocks/proseTags";
import { metaSourceLine } from "../blocks/schemaValues";
import { BlockZone, renderZones } from "../blocks/shape";
import { renderTagSpan } from "../blocks/tagSpan";
import { osZoneLabel } from "../otherscape/labels";
import { renderOsTheme } from "../osThemes/renderer";
import { OsCharacterData, OsCharacterLoadoutItem, OsTagCombo } from "./parser";
import { osCharacterShape } from "./shape";

function band(doc: Document, zone: BlockZone): HTMLElement {
	const element = doc.createElement("section");
	if (zone.heading) { const heading = doc.createElement("h4"); heading.textContent = zone.heading; element.appendChild(heading); }
	return element;
}

function box(doc: Document): HTMLInputElement {
	const input = doc.createElement("input");
	input.type = "checkbox";
	input.disabled = true;
	input.classList.add("brumes-os-character--box");
	return input;
}

function paragraph(doc: Document, className: string): HTMLElement {
	const element = doc.createElement("p");
	element.classList.add(className);
	return element;
}

const EMPHASIS_PATTERN = /\*\*([^*]+)\*\*|\*([^*]+)\*/;

/** The contract's inline Markdown for an effect: `**strong**`, `*emphasis*`, and `{tags}` in the plain runs. */
function renderEffect(parent: HTMLElement, text: string, doc: Document): void {
	const pattern = new RegExp(EMPHASIS_PATTERN.source, "g");
	let lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(text)) !== null) {
		const index = match.index;
		if (index > lastIndex) renderProse(parent, text.slice(lastIndex, index), doc);
		const emphasis = doc.createElement(match[1] !== undefined ? "strong" : "em");
		renderProse(emphasis, match[1] ?? match[2], doc);
		parent.appendChild(emphasis);
		lastIndex = index + match[0].length;
	}
	if (lastIndex < text.length) renderProse(parent, text.slice(lastIndex), doc);
}

function renderCombo(combo: OsTagCombo, doc: Document): HTMLElement {
	const column = doc.createElement("div");
	column.classList.add("brumes-os-character--combo");
	const label = paragraph(doc, "brumes-os-character--combo-label");
	label.textContent = combo.label;
	column.appendChild(label);
	// The `+` between tags is the pack's, drawn after every item but the last.
	const tags = doc.createElement("ul");
	tags.classList.add("brumes-os-character--combo-tags");
	for (const tag of combo.tags) {
		const item = doc.createElement("li");
		item.appendChild(renderTagSpan(tag, doc, { force: "power" }));
		tags.appendChild(item);
	}
	column.appendChild(tags);
	const power = paragraph(doc, "brumes-os-character--combo-power");
	const word = doc.createElement("span");
	word.textContent = `${osZoneLabel("character", "power")} `;
	power.appendChild(word);
	const value = doc.createElement("strong");
	value.textContent = String(combo.power);
	power.appendChild(value);
	column.appendChild(power);
	const effect = paragraph(doc, "brumes-os-character--combo-effect");
	renderEffect(effect, combo.effect, doc);
	column.appendChild(effect);
	return column;
}

/** An item: its tag, burnt until the item is loaded, then its other feature tags and its weakness. */
function renderItem(item: OsCharacterLoadoutItem, doc: Document): HTMLElement {
	const entry = doc.createElement("li");
	entry.classList.add("brumes-os-character--item");
	if (item.loaded) entry.classList.add("brumes-os-character--item-loaded");
	entry.appendChild(renderTagSpan(item.name, doc, { force: "power", burnt: !item.loaded }));
	const others: string[] = [];
	for (const tag of item.featureTags) if (tag !== item.name) others.push(tag);
	if (others.length) {
		const small = doc.createElement("small");
		small.textContent = others.join(", ");
		entry.appendChild(small);
	}
	if (item.weaknessTag) entry.appendChild(renderTagSpan(item.weaknessTag, doc, { force: "weakness" }));
	return entry;
}

function itemColumn(items: OsCharacterLoadoutItem[], doc: Document, loaded: boolean): HTMLElement | null {
	const list = doc.createElement("ul");
	list.classList.add(loaded ? "brumes-os-character--loaded" : "brumes-os-character--unloaded");
	let count = 0;
	for (const item of items) {
		if (item.loaded !== loaded) continue;
		list.appendChild(renderItem(item, doc));
		count += 1;
	}
	return count ? list : null;
}

export function renderOsCharacter(data: OsCharacterData, doc: Document): HTMLElement {
	const root = doc.createElement("article");
	root.classList.add("brumes-os-character");
	renderZones(root, osCharacterShape, {
		header: () => {
			const header = doc.createElement("header");
			const title = doc.createElement("h3");
			title.textContent = data.name;
			header.appendChild(title);
			if (data.meta) {
				const source = doc.createElement("small");
				source.textContent = metaSourceLine(data.meta);
				header.appendChild(source);
			}
			return header;
		},
		upgrades: (zone) => {
			const element = band(doc, zone);
			const rule = paragraph(doc, "brumes-os-character--rule");
			rule.textContent = osZoneLabel("character", "upgrades_rule");
			element.appendChild(rule);
			const choices = doc.createElement("ul");
			for (const key of ["upgrade_power_tag", "upgrade_special"] as const) {
				const item = doc.createElement("li");
				item.appendChild(box(doc));
				const choice = doc.createElement("span");
				choice.textContent = osZoneLabel("character", key);
				item.appendChild(choice);
				choices.appendChild(item);
			}
			element.appendChild(choices);
			return element;
		},
		"tag-combos": (zone) => {
			if (!data.tagCombos.length) return null;
			const element = band(doc, zone);
			const columns = doc.createElement("div");
			columns.classList.add("brumes-os-character--combos");
			for (const combo of data.tagCombos) columns.appendChild(renderCombo(combo, doc));
			element.appendChild(columns);
			return element;
		},
		loadout: (zone) => {
			if (!data.loadout.length) return null;
			const element = band(doc, zone);
			const columns = doc.createElement("div");
			columns.classList.add("brumes-os-character--items");
			for (const loaded of [true, false]) {
				const column = itemColumn(data.loadout, doc, loaded);
				if (column) columns.appendChild(column);
			}
			element.appendChild(columns);
			return element;
		},
		themes: () => {
			if (!data.themes.length) return null;
			const cards = doc.createElement("div");
			for (const theme of data.themes) cards.appendChild(renderOsTheme(theme, doc));
			return cards;
		},
	});
	return root;
}
