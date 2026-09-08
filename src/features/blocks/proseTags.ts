import { renderTagSpan } from "./tagSpan";

const BRACED_TAG_PATTERN = /\{([^}]+)\}/g;

/**
 * Render a line of prose, turning every `{tag}` into the same tag span an
 * isolated field already gets — the braces the block grammar uses elsewhere
 * to group a multi-word tag — and leaving the rest as plain text. This is how
 * a status written inside a consequence, a threat or a vignette trigger gets
 * the same pill the tag lists render, e.g. `The hull gains {hull-gashed-2}.`
 */
export function renderProse(text: string, doc: Document): DocumentFragment {
	const fragment = doc.createDocumentFragment();
	let lastIndex = 0;
	let match = BRACED_TAG_PATTERN.exec(text);

	while (match !== null) {
		if (match.index > lastIndex) {
			fragment.appendChild(doc.createTextNode(text.slice(lastIndex, match.index)));
		}

		fragment.appendChild(renderTagSpan(match[1].trim(), doc));
		lastIndex = match.index + match[0].length;
		match = BRACED_TAG_PATTERN.exec(text);
	}

	BRACED_TAG_PATTERN.lastIndex = 0;

	if (lastIndex < text.length) {
		fragment.appendChild(doc.createTextNode(text.slice(lastIndex)));
	}

	return fragment;
}
