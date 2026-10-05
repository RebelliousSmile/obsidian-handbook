/** Class of a block tall enough to deserve a page of its own. */
export const PRINT_FULL_PAGE = "handbook-print-full-page";
/** Class of a block shorter than that: it is only kept from splitting. */
export const PRINT_KEEP_TOGETHER = "handbook-print-keep-together";

/** Class of the headings that lead a full-page block: they start the page with it. */
export const PRINT_PAGE_LEAD = "handbook-print-page-lead";
/** Class of a full-page block whose leading headings already start the page. */
export const PRINT_LED = "handbook-print-led";

/** Share of the printable page above which a block takes the whole page. */
export const FULL_PAGE_RATIO = 0.4;
/**
 * Printable height of a page (A4 or Letter) with Obsidian's default margins, in CSS
 * pixels. CSS cannot compare an element to the page, and the export container
 * does not know the paper size, so the threshold is measured against this.
 */
export const PRINTABLE_PAGE_HEIGHT = 1000;

/**
 * Height a block must fit in once it shares its page with its headings. Under
 * the page itself because the margins of the paper are not known here.
 */
export const FIT_PAGE_HEIGHT = 900;

const HEADING = /^H[1-6]$/;

/** Block templates and figures: the only blocks big enough to deserve a page. */
const PAGE_BLOCKS = [
	"figure",
	".brumes-adrenaline-pj",
	".brumes-adrenaline-pnj",
	".brumes-adrenaline-monstre",
];

/** Every block kept from splitting; callouts, code and tables never take a page. */
const KEPT_BLOCKS = [".callout", "pre", "table", ...PAGE_BLOCKS].join(",");
const PAGE_BLOCK = PAGE_BLOCKS.join(",");

/** A block whose height reaches the share of the page takes the page. */
export function takesFullPage(
	height: number,
	pageHeight: number = PRINTABLE_PAGE_HEIGHT,
	ratio: number = FULL_PAGE_RATIO,
): boolean {
	return height > 0 && height >= pageHeight * ratio;
}

/**
 * Smallest scale a block is shrunk to. Under it the height was not measured at
 * the width of the page (a section laid out narrow reads absurdly tall): the
 * block keeps its size and is only kept from splitting.
 */
export const MIN_FIT_SCALE = 0.5;

/** The scale (at most 1) that fits `height` in `room`; 1 when it would crush the block. */
export function fitScale(height: number, room: number = FIT_PAGE_HEIGHT): number {
	if (!(height > room && room > 0)) return 1;
	const scale = room / height;
	return scale < MIN_FIT_SCALE ? 1 : scale;
}

/** The heading an element is, or wraps alone (Obsidian renders each source section in its own div). */
function headingOf(element: Element): HTMLElement | null {
	if (HEADING.test(element.tagName)) return element.instanceOf(HTMLElement) ? element : null;
	return element.children.length === 1 ? headingOf(element.children[0]) : null;
}

/**
 * A full-page block starts its page with the headings just before it, so a
 * title never stays alone at the foot of the previous page; the block is
 * shrunk when it would not fit under them. The block may sit alone in a section
 * wrapper, so the headings are looked up from the wrapper that has neighbours.
 */
function startPageWith(block: HTMLElement, container: HTMLElement): void {
	let anchor: Element = block;
	while (!anchor.previousElementSibling && anchor.parentElement && anchor.parentElement !== container) {
		anchor = anchor.parentElement;
	}
	const leads: HTMLElement[] = [];
	for (
		let previous = anchor.previousElementSibling;
		previous;
		previous = previous.previousElementSibling
	) {
		const heading = headingOf(previous);
		if (!heading) break;
		leads.push(heading);
	}
	const leadHeight = leads.reduce((sum, lead) => sum + lead.getBoundingClientRect().height, 0);
	const height = block.getBoundingClientRect().height;
	const scale = fitScale(height, FIT_PAGE_HEIGHT - leadHeight);
	if (scale < 1) block.style.setProperty("zoom", String(scale));
	const first = leads[leads.length - 1];
	if (first) {
		first.classList.add(PRINT_PAGE_LEAD);
		block.classList.add(PRINT_LED);
	}
}

/** Height an image will have at the width it is laid out at, before it loads. */
function imageHeight(image: HTMLImageElement): number {
	const laidOut = image.getBoundingClientRect();
	if (laidOut.height > 0) return laidOut.height;
	if (image.naturalWidth > 0 && laidOut.width > 0) {
		return (laidOut.width * image.naturalHeight) / image.naturalWidth;
	}
	return 0;
}

async function loaded(image: HTMLImageElement): Promise<void> {
	if (image.complete) return;
	try {
		await image.decode();
	} catch {
		// A broken image keeps whatever size it was laid out with.
	}
}

/**
 * Mark the blocks of an exported note: those at least as tall as the share of
 * the page take the whole page, the others are only kept from splitting.
 * Resolves once the images are measured; the export waits for it.
 */
export async function markPrintPageBreaks(
	container: HTMLElement,
	pageHeight: number = PRINTABLE_PAGE_HEIGHT,
): Promise<void> {
	const images = Array.from(container.querySelectorAll("img"));
	await Promise.all(images.map(loaded));

	const blocks = Array.from(container.querySelectorAll(KEPT_BLOCKS));
	for (const block of blocks) {
		// A callout inside a callout is part of its parent, which carries the rule.
		if (block.parentElement?.closest(KEPT_BLOCKS)) continue;
		if (block.matches(PAGE_BLOCK) && takesFullPage(block.getBoundingClientRect().height, pageHeight)) {
			block.classList.add(PRINT_FULL_PAGE);
			if (block.instanceOf(HTMLElement)) startPageWith(block, container);
		} else {
			block.classList.add(PRINT_KEEP_TOGETHER);
		}
	}
	for (const image of images) {
		if (image.closest(KEPT_BLOCKS)) continue;
		if (takesFullPage(imageHeight(image), pageHeight)) {
			// A wiki embed is an inline span: the break goes on the paragraph or figure around it, never on a column.
			const holder = image.closest<HTMLElement>("p, figure") ?? image;
			holder.classList.add(PRINT_FULL_PAGE);
			startPageWith(holder, container);
		}
	}
}
