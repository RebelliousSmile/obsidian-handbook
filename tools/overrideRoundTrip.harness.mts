/**
 * The override round trip, asserted rather than eyeballed.
 *
 * Phase 5 promises three things about `overrides.json`: a pack may change one
 * zone and leave the others alone, a zone no shape has warns once and does not
 * stop the rest, and removing the file returns the block to exactly what it
 * drew before. The first two are visible in a vault; the third is not — an
 * eye cannot tell "the same" from "almost the same". So it is compared here,
 * byte for byte, on the corpus itself.
 *
 * Run it with `pnpm assert:override`, never with node directly: it needs the
 * esbuild bundle that `tools/assert-override.mjs` produces.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { BRUMES_BLOCKS } from "../src/features/blocks/registry";
import {
	resetShapeReports,
	setShapeOverrides,
} from "../src/features/blocks/shape";
import { parseGameOverride } from "../src/games/overrides";
import { log } from "../src/utils/logger";

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

const doc = { createElement: (tagName: string) => new El(tagName) };

function dump(element: El, depth: number): string {
	const pad = "  ".repeat(depth);
	const classes = element.classes.slice().sort().join(" ");
	let out = `${pad}<${element.tagName}> .${classes}`;
	out += element.textContent ? ` "${element.textContent}"\n` : "\n";

	for (const child of element.children) {
		out += dump(child, depth + 1);
	}

	return out;
}

function draw(id: string): string {
	for (const block of BRUMES_BLOCKS) {
		if (block.id !== id) {
			continue;
		}

		const raw = readFileSync(
			join(process.cwd(), "corpus", "temoins", `${id}.toml`),
			"utf8",
		);
		const data = block.parse(raw);

		if (data === null) {
			throw new Error(`the witness of ${id} does not parse`);
		}

		return dump(block.render(data, doc as unknown as Document) as unknown as El, 0);
	}

	throw new Error(`no block called ${id}`);
}

const failures: string[] = [];

function check(claim: string, held: boolean): void {
	if (!held) {
		failures.push(claim);
	}
}

/* ------------------------------------------------------------------ *
 * The warnings are counted, so `log.warn` is both raised to a level
 * that speaks and watched.
 * ------------------------------------------------------------------ */

log.setLevel("warn");
const warnings: string[] = [];
const realWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
	warnings.push(args.map((arg) => String(arg)).join(" "));
};

/* ------------------------------------------------------------------ *
 * 1. The block as the game draws it, with no file at all.
 * ------------------------------------------------------------------ */

setShapeOverrides({});
resetShapeReports();
const before = draw("litm-challenge");

check(
	"the untouched challenge carries its English heading",
	before.indexOf('"Threats & consequences"') !== -1,
);
check(
	"the untouched challenge draws its secrets zone",
	before.indexOf("brumes-challenge--secrets") !== -1,
);

/* ------------------------------------------------------------------ *
 * 2. A file naming one zone of one block, plus a zone no shape has.
 * ------------------------------------------------------------------ */

const file = parseGameOverride(
	JSON.stringify({
		shapes: {
			"litm-challenge": {
				threats: { heading: "Menaces et conséquences" },
				secrets: { hidden: true },
				"zone-qui-nexiste-pas": { heading: "Rien" },
			},
		},
	}),
);

setShapeOverrides(file.shapes);
const during = draw("litm-challenge");

check(
	"the named zone takes the wording the file gives it",
	during.indexOf('"Menaces et conséquences"') !== -1,
);
check(
	"a zone the file hides is not drawn",
	during.indexOf("brumes-challenge--secrets") === -1,
);
check(
	"the zones the file leaves alone keep the block's wording",
	during.indexOf('"Limits"') !== -1 && during.indexOf('"Might"') !== -1,
);
check("the file changed the block", during !== before);

const straysAfterOne = warnings.filter(
	(line) => line.indexOf("zone-qui-nexiste-pas") !== -1,
).length;

check("a zone no shape has is reported", straysAfterOne === 1);

// Drawn a second time, the same stray must stay silent: a warning is worth a
// session, not a repaint.
draw("litm-challenge");

const straysAfterTwo = warnings.filter(
	(line) => line.indexOf("zone-qui-nexiste-pas") !== -1,
).length;

check("the stray is reported once, not once per render", straysAfterTwo === 1);

// The other blocks are untouched by a file that names only this one.
setShapeOverrides({});
resetShapeReports();
const otherAlone = draw("litm-journey");
setShapeOverrides(file.shapes);

check(
	"a file naming one block leaves the others exactly as they were",
	draw("litm-journey") === otherAlone,
);

/* ------------------------------------------------------------------ *
 * 2b. A file wrapped under "pack" — style, shapes and polarities all one
 * level deeper. Shapes and polarities always walked into "pack" first;
 * style used to stop at the top level and come back empty.
 * ------------------------------------------------------------------ */

const wrapped = parseGameOverride(
	JSON.stringify({
		pack: {
			style: {
				base: { note: { "--wrapped-token": "wrapped" } },
			},
			shapes: {
				"litm-challenge": {
					threats: { heading: "Sous pack" },
				},
			},
		},
	}),
);

check(
	"a style wrapped under \"pack\" is still read",
	wrapped.style.base?.note?.["--wrapped-token"] === "wrapped",
);
check(
	"shapes wrapped under \"pack\" are still read alongside it",
	wrapped.shapes["litm-challenge"]?.threats?.heading === "Sous pack",
);

/* ------------------------------------------------------------------ *
 * 3. The file removed. This is the promise worth measuring.
 * ------------------------------------------------------------------ */

setShapeOverrides({});
const after = draw("litm-challenge");

check("removing the file restores the block byte for byte", after === before);

/* ------------------------------------------------------------------ *
 * Verdict.
 * ------------------------------------------------------------------ */

console.warn = realWarn;

if (failures.length > 0) {
	for (const failure of failures) {
		console.error(`not held: ${failure}`);
	}

	console.error(`override round trip: ${failures.length} broken`);
	process.exit(1);
}

console.log("override round trip: green");
