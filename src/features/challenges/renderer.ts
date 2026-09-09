import { renderProse } from "../blocks/proseTags";
import { metaSourceLine } from "../blocks/schemaValues";
import { BlockZone, renderZones } from "../blocks/shape";
import { renderRatedLimit, renderTagSpan } from "../blocks/tagSpan";
import { ChallengeData } from "./parser";
import { challengeShape } from "./shape";

/**
 * Open a card section, its heading carrying the printed wording of the zone.
 *
 * The zone class and the section family come from the shape; the heading has
 * to be posed here, because it must be the first thing inside the section and
 * only this side holds the element while it is still empty.
 */
function openSection(doc: Document, zone: BlockZone): HTMLElement {
	const section = doc.createElement("section");

	if (zone.heading) {
		const heading = doc.createElement("h4");
		heading.classList.add("brumes-challenge--section-title");
		heading.textContent = zone.heading;
		section.appendChild(heading);
	}

	return section;
}

function addList(section: HTMLElement, doc: Document, name: string): HTMLElement {
	const list = doc.createElement("ul");
	list.classList.add(`brumes-challenge--${name}-list`);
	section.appendChild(list);
	return list;
}

function addLine(
	parent: HTMLElement,
	doc: Document,
	className: string,
	text: string,
): HTMLElement {
	const line = doc.createElement("div");
	line.classList.add(className);
	renderProse(line, text, doc);
	parent.appendChild(line);
	return line;
}

export function renderChallenge(
	data: ChallengeData,
	doc: Document,
): HTMLElement {
	const container = doc.createElement("div");
	container.classList.add("brumes-challenge");

	renderZones(container, challengeShape, {
		header: () => {
			const header = doc.createElement("header");
			addLine(header, doc, "brumes-challenge--name", data.name);

			if (data.roles.length > 0) {
				addLine(header, doc, "brumes-challenge--roles", data.roles.join(", "));
			}

			if (typeof data.rating === "number") {
				addLine(header, doc, "brumes-challenge--rating", String(data.rating));
			}

			return header;
		},
		description: (zone) => {
			if (data.description.length === 0) {
				return null;
			}

			const description = openSection(doc, zone);

			for (const paragraph of data.description) {
				const p = doc.createElement("p");
				renderProse(p, paragraph, doc);
				description.appendChild(p);
			}

			return description;
		},
		limits: (zone) => {
			if (data.limits.length === 0) {
				return null;
			}

			const section = openSection(doc, zone);
			const list = addList(section, doc, "limit");

			for (const limit of data.limits) {
				const item = doc.createElement("li");
				item.classList.add("brumes-challenge--limit");

				if (limit.progress) {
					item.classList.add("brumes-challenge--limit--progress");
				}

				item.appendChild(renderRatedLimit(limit.name, limit.rating, doc));

				if (limit.consequence) {
					addLine(
						item,
						doc,
						"brumes-challenge--limit-consequence",
						limit.consequence,
					);
				}

				list.appendChild(item);
			}

			return section;
		},
		might: (zone) => {
			if (data.mights.length === 0) {
				return null;
			}

			const section = openSection(doc, zone);

			for (const might of data.mights) {
				const aspect = addLine(
					section,
					doc,
					"brumes-challenge--might-aspect",
					might.aspect,
				);

				if (might.level) {
					aspect.classList.add(`brumes-challenge--might--${might.level}`);
				}

				if (might.vulnerability) {
					const vulnerability = doc.createElement("span");
					vulnerability.classList.add("brumes-challenge--might-vulnerability");
					renderProse(vulnerability, might.vulnerability, doc);
					aspect.appendChild(vulnerability);
				}
			}

			return section;
		},
		tags: (zone) => {
			if (data.tags.length === 0) {
				return null;
			}

			const section = openSection(doc, zone);
			const list = addList(section, doc, "tag");

			for (const tag of data.tags) {
				const item = doc.createElement("li");
				item.appendChild(renderTagSpan(tag, doc));
				list.appendChild(item);
			}

			return section;
		},
		features: (zone) => {
			if (data.features.length === 0) {
				return null;
			}

			const section = openSection(doc, zone);
			const list = addList(section, doc, "feature");

			for (const feature of data.features) {
				const item = doc.createElement("li");
				item.classList.add("brumes-challenge--feature");

				const name = doc.createElement("span");
				name.classList.add("brumes-challenge--feature-name");
				name.textContent = feature.name;
				item.appendChild(name);

				if (feature.effect) {
					const effect = doc.createElement("span");
					effect.classList.add("brumes-challenge--feature-effect");
					renderProse(effect, feature.effect, doc);
					item.appendChild(effect);
				}

				list.appendChild(item);
			}

			return section;
		},
		threats: (zone) => {
			if (data.threats.length === 0) {
				return null;
			}

			const section = openSection(doc, zone);
			const list = addList(section, doc, "threat");

			for (const threat of data.threats) {
				const item = doc.createElement("li");
				item.classList.add("brumes-challenge--threat");
				addLine(item, doc, "brumes-challenge--threat-name", threat.name);

				if (threat.trigger) {
					addLine(
						item,
						doc,
						"brumes-challenge--threat-trigger",
						threat.trigger,
					);
				}

				if (threat.consequences.length > 0) {
					const consequences = doc.createElement("ul");
					consequences.classList.add("brumes-challenge--consequence-list");

					for (const consequence of threat.consequences) {
						const line = doc.createElement("li");
						line.classList.add("brumes-challenge--consequence");
						renderProse(line, consequence, doc);
						consequences.appendChild(line);
					}

					item.appendChild(consequences);
				}

				list.appendChild(item);
			}

			return section;
		},
		"general-consequences": (zone) => {
			if (data.generalConsequences.length === 0) {
				return null;
			}

			const section = openSection(doc, zone);
			const list = addList(section, doc, "consequence");

			for (const consequence of data.generalConsequences) {
				const item = doc.createElement("li");
				item.classList.add("brumes-challenge--consequence");
				renderProse(item, consequence, doc);
				list.appendChild(item);
			}

			return section;
		},
		secrets: (zone) => {
			if (data.secrets.length === 0) {
				return null;
			}

			const section = openSection(doc, zone);
			const list = addList(section, doc, "secret");

			for (const secret of data.secrets) {
				const item = doc.createElement("li");
				item.classList.add("brumes-challenge--secret");

				if (secret.label) {
					const label = doc.createElement("span");
					label.classList.add("brumes-challenge--secret-label");
					label.textContent = secret.label;
					item.appendChild(label);
				}

				const text = doc.createElement("span");
				text.classList.add("brumes-challenge--secret-text");
				renderProse(text, secret.text, doc);
				item.appendChild(text);

				list.appendChild(item);
			}

			return section;
		},
		source: () => {
			if (!data.meta) {
				return null;
			}

			const source = metaSourceLine(data.meta);

			if (!source) {
				return null;
			}

			const footer = doc.createElement("footer");
			footer.textContent = source;

			return footer;
		},
	});

	return container;
}
