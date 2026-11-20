/**
 * The notes page of a character sheet: the free text the player writes while playing, drawn after
 * the sheet like the last printed page.
 *
 * Which field holds the text and how the page is titled come from the pack that publishes the sheet
 * (`notesPath`, `notes_field`, the label of the notes page); this file only draws them. A blank
 * text draws nothing, so a player who emptied the notes for the next session sees no empty frame.
 */
export const SESSION_NOTES_CLASS = "brumes-session-notes";

/** The notes page, or `null` when the text is absent or only blanks. The text is never interpreted. */
export function renderSessionNotes(doc: Document, label: string, text: unknown): HTMLElement | null {
	if (typeof text !== "string" || text.trim() === "") return null;
	const page = doc.createElement("section");
	page.classList.add(SESSION_NOTES_CLASS);
	const heading = doc.createElement("h4");
	heading.classList.add(`${SESSION_NOTES_CLASS}--title`);
	heading.textContent = label;
	page.appendChild(heading);
	const body = doc.createElement("p");
	body.classList.add(`${SESSION_NOTES_CLASS}--text`);
	body.textContent = text;
	page.appendChild(body);
	return page;
}
