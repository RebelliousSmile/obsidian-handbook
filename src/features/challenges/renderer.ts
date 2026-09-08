import { metaSourceLine } from "../blocks/schemaValues";
import { renderZones } from "../blocks/shape";
import { renderRatedLimit, renderTagSpan } from "../blocks/tagSpan";
import { ChallengeData } from "./parser";
import { challengeShape } from "./shape";

/**
 * Open a card section, its heading carrying the printed profile wording.
 *
 * The zone class comes from the shape; what this adds is the section family
 * and the heading, neither of which the vocabulary has a word for.
 */
function openSection(doc: Document, title: string): HTMLElement {
	const section = doc.createElement("section");
	section.classList.add("brumes-challenge--section");

	const heading = doc.createElement("h4");
	heading.classList.add("brumes-challenge--section-title");
	heading.textContent = title;
	section.appendChild(heading);

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
	line.textContent = text;
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
		description: () => {
			if (data.description.length === 0) {
				return null;
			}

			const description = doc.createElement("section");
			description.classList.add("brumes-challenge--section");

			for (const paragraph of data.description) {
				const p = doc.createElement("p");
				p.textContent = paragraph;
				description.appendChild(p);
			}

			return description;
		},
		limits: () => {
			if (data.limits.length === 0) {
				return null;
			}

			const section = openSection(doc, "Limits");
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
		might: () => {
			if (data.mights.length === 0) {
				return null;
			}

			const section = openSection(doc, "Might");

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
					vulnerability.textContent = might.vulnerability;
					aspect.appendChild(vulnerability);
				}
			}

			return section;
		},
		tags: () => {
			if (data.tags.length === 0) {
				return null;
			}

			const section = openSection(doc, "Tags & statuses");
			const list = addList(section, doc, "tag");

			for (const tag of data.tags) {
				const item = doc.createElement("li");
				item.appendChild(renderTagSpan(tag, doc));
				list.appendChild(item);
			}

			return section;
		},
		features: () => {
			if (data.features.length === 0) {
				return null;
			}

			const section = openSection(doc, "Special features");
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
					effect.textContent = feature.effect;
					item.appendChild(effect);
				}

				list.appendChild(item);
			}

			return section;
		},
		threats: () => {
			if (data.threats.length === 0) {
				return null;
			}

			const section = openSection(doc, "Threats & consequences");
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
						line.textContent = consequence;
						consequences.appendChild(line);
					}

					item.appendChild(consequences);
				}

				list.appendChild(item);
			}

			return section;
		},
		"general-consequences": () => {
			if (data.generalConsequences.length === 0) {
				return null;
			}

			const section = openSection(doc, "General consequences");
			const list = addList(section, doc, "consequence");

			for (const consequence of data.generalConsequences) {
				const item = doc.createElement("li");
				item.classList.add("brumes-challenge--consequence");
				item.textContent = consequence;
				list.appendChild(item);
			}

			return section;
		},
		secrets: () => {
			if (data.secrets.length === 0) {
				return null;
			}

			const section = openSection(doc, "Secrets");
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
				text.textContent = secret.text;
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
