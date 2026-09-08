/**
 * Dump the DOM every corpus witness renders to, as text.
 *
 * A change that claims to leave the screen alone is worth nothing until the
 * two sides are compared. This prints the tree — tag, classes, own text — for
 * every corpus file, and the same run before and after such a change must
 * produce the same bytes.
 *
 * How to use it: `pnpm dump:dom > before.txt`, make the change, run it again
 * into `after.txt`, and diff. It asserts nothing on its own — the diff is the
 * assertion, and it is the reader who reads it.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { BRUMES_BLOCKS } from "../src/features/blocks/registry";

class El {
	tagName: string;
	textContent = "";
	children: El[] = [];
	dataset: Record<string, string> = {};
	title = "";
	classList = {
		add: (...names: string[]) => {
			for (const name of names) {
				this.classes.push(name);
			}
		},
	};
	classes: string[] = [];

	constructor(tagName: string) {
		this.tagName = tagName;
	}

	appendChild(child: El): El {
		this.children.push(child);
		return child;
	}
}

const doc = {
	createElement: (tagName: string) => new El(tagName),
};

function dump(element: El, depth: number): string {
	const pad = "  ".repeat(depth);
	// Classes are sorted: the vocabulary changed the order some classes are
	// added in, which no selector can see. Order that CSS cannot observe is
	// not a difference worth reporting.
	const classes = element.classes.slice().sort().join(" ");
	const data = Object.keys(element.dataset)
		.sort()
		.map((key) => `${key}=${element.dataset[key]}`)
		.join(" ");
	const parts = [`${pad}<${element.tagName}>`];

	if (classes) {
		parts.push(`.${classes}`);
	}

	if (data) {
		parts.push(`[${data}]`);
	}

	if (element.title) {
		parts.push(`title=${element.title}`);
	}

	if (element.textContent) {
		parts.push(`"${element.textContent}"`);
	}

	let out = `${parts.join(" ")}\n`;

	for (const child of element.children) {
		out += dump(child, depth + 1);
	}

	return out;
}

const CORPUS = join(process.cwd(), "corpus");

function blockOf(id: string) {
	for (const candidate of BRUMES_BLOCKS) {
		if (candidate.id === id) {
			return candidate;
		}
	}

	return null;
}

// Every corpus file, not only the witnesses: a refusal renders a degraded
// block, which is where the optional zones are actually absent. A comparison
// that only saw complete cards would prove nothing about the missing ones.
for (const folder of ["temoins", "refus"]) {
	const files = readdirSync(join(CORPUS, folder)).sort();

	for (const file of files) {
		const dot = file.indexOf(".");
		const id = dot === -1 ? file : file.slice(0, dot);
		const block = blockOf(id);

		console.log(`### ${folder}/${file}`);

		if (!block) {
			console.log("no block");
			continue;
		}

		const data = block.parse(readFileSync(join(CORPUS, folder, file), "utf8"));

		if (data === null) {
			console.log("null");
			continue;
		}

		process.stdout.write(
			dump(block.render(data, doc as unknown as Document) as unknown as El, 0),
		);
	}
}
