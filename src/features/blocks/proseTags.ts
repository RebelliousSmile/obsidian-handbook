import { renderTagSpan } from "./tagSpan";

const BRACED_TAG_PATTERN = /\{([^}]+)\}/g;

/**
 * Append a line of prose to `parent`, turning every `{tag}` into the same
 * tag span an isolated field already gets — the braces the block grammar
 * uses elsewhere to group a multi-word tag — and leaving the rest as plain
 * text. This is how a status written inside a consequence, a threat or a
 * vignette trigger gets the same pill the tag lists render, e.g.
 * `The hull gains {hull-gashed-2}.`
 *
 * Builds only with `createElement`, `appendChild`, `classList.add`, `dataset`
 * and `textContent` — the document stub every corpus harness offers — rather
 * than a `DocumentFragment` and text nodes, which none of them implement.
 */
export function renderProse(
	parent: HTMLElement,
	text: string,
	doc: Document,
): void {
	let lastIndex = 0;
	let match = BRACED_TAG_PATTERN.exec(text);

	while (match !== null) {
		if (match.index > lastIndex) {
			const run = doc.createElement("span");
			run.textContent = text.slice(lastIndex, match.index);
			parent.appendChild(run);
		}

		parent.appendChild(renderTagSpan(match[1].trim(), doc));
		lastIndex = match.index + match[0].length;
		match = BRACED_TAG_PATTERN.exec(text);
	}

	BRACED_TAG_PATTERN.lastIndex = 0;

	if (lastIndex < text.length) {
		const run = doc.createElement("span");
		run.textContent = text.slice(lastIndex);
		parent.appendChild(run);
	}
}
