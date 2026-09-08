/**
 * The corpus assertions.
 *
 * The repo has no test runner — no vitest, no jest, no tsx — it has a
 * convention: bundle a throwaway harness with esbuild, run it with node. This
 * file formalises it once instead of reinventing it per block.
 *
 * The `.mts` extension is load-bearing. `tsconfig.json` carries
 * `"include": ["**\/*.ts"]`, so `tsc -noEmit` sweeps the whole repo, `tools/`
 * included; `eslint.config.mjs` carries `files: ["**\/*.ts"]` and ignores only
 * node_modules, dist and demo. A `.ts` here would break the build exactly the
 * way one in `src/` does. A `.mts` escapes both.
 *
 * Run it with `pnpm assert:corpus`, never with node directly: it needs the
 * esbuild bundle that `tools/assert-corpus.mjs` produces.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { BRUMES_BLOCKS } from "../src/features/blocks/registry";
import { TOML_EXPORTS } from "../src/features/blocks/tomlExports";
import type { BrumesBlock } from "../src/features/blocks/types";
import { log } from "../src/utils/logger";

/**
 * The blocks that do not yet honour the guideline.
 *
 * It is empty, and staying empty is the point: a new block added without a
 * schema document and a copy command breaks here, instead of being discovered
 * by an assert six months later the way these four were. Naming a block here
 * is how a debt is taken on deliberately — never how one is hidden.
 */
const BLOCKS_IN_DEBT: string[] = [];

// pnpm runs its scripts from the repo root, so the corpus is right there.
const CORPUS = join(process.cwd(), "corpus");
const failures: string[] = [];

function fail(file: string, reason: string): void {
	failures.push(`${file}: ${reason}`);
}

/* ------------------------------------------------------------------ *
 * A document stub. The renderers touch createElement, appendChild,
 * classList.add, dataset and textContent, and nothing else.
 * ------------------------------------------------------------------ */

class El {
	tagName: string;
	textContent = "";
	children: El[] = [];
	dataset: Record<string, string> = {};
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

/** Every text the rendered tree carries, so an empty render is visible. */
function renderedText(element: El): string {
	let text = element.textContent;

	for (const child of element.children) {
		text += renderedText(child);
	}

	return text;
}

/* ------------------------------------------------------------------ *
 * The corpus
 * ------------------------------------------------------------------ */

/** A corpus file is named after the block it feeds, before the first dot. */
function blockIdOf(file: string): string {
	const dot = file.indexOf(".");

	return dot === -1 ? file : file.slice(0, dot);
}

function findBlock(id: string): BrumesBlock<unknown> | null {
	for (const block of BRUMES_BLOCKS) {
		if (block.id === id) {
			return block;
		}
	}

	return null;
}

/** The `# attend:` directive a refusal opens on. */
function readExpectation(source: string): string {
	for (const raw of source.split("\n")) {
		const line = raw.trim();

		if (line.length === 0) {
			continue;
		}

		if (line.charAt(0) !== "#") {
			return "";
		}

		const marker = line.indexOf("attend:");

		if (marker !== -1) {
			return line.slice(marker + "attend:".length).trim();
		}
	}

	return "";
}

function listCorpus(camp: string): string[] {
	return readdirSync(join(CORPUS, camp)).filter(
		(file) => file.slice(-5) === ".toml",
	);
}

function assertTemoins(): void {
	for (const file of listCorpus("temoins")) {
		const id = blockIdOf(file);
		const block = findBlock(id);

		if (!block) {
			fail(file, `no block is registered under "${id}"`);
			continue;
		}

		const source = readFileSync(join(CORPUS, "temoins", file), "utf8");
		let data: unknown;

		try {
			data = block.parse(source);
		} catch (error) {
			fail(file, `parse threw: ${String(error)}`);
			continue;
		}

		if (data === null) {
			fail(file, "a witness must parse, and this one returned null");
			continue;
		}

		let element: El;

		try {
			element = block.render(data, doc as unknown as Document) as unknown as El;
		} catch (error) {
			fail(file, `render threw: ${String(error)}`);
			continue;
		}

		if (renderedText(element).trim().length === 0) {
			fail(file, "the witness rendered an element with no text in it");
		}
	}
}

function assertRefus(): void {
	for (const file of listCorpus("refus")) {
		const id = blockIdOf(file);
		const block = findBlock(id);

		if (!block) {
			fail(file, `no block is registered under "${id}"`);
			continue;
		}

		const source = readFileSync(join(CORPUS, "refus", file), "utf8");
		const expected = readExpectation(source);

		if (expected !== "null" && expected !== "dégradé") {
			fail(
				file,
				'it must open on "# attend: null" or "# attend: dégradé"',
			);
			continue;
		}

		let data: unknown;

		try {
			data = block.parse(source);
		} catch (error) {
			fail(file, `parse threw instead of degrading: ${String(error)}`);
			continue;
		}

		if (expected === "null") {
			if (data !== null) {
				fail(file, "the fault should have left nothing to render");
			}
			continue;
		}

		if (data === null) {
			fail(file, "the fault cost the whole block instead of its own field");
			continue;
		}

		try {
			const element = block.render(
				data,
				doc as unknown as Document,
			) as unknown as El;

			if (renderedText(element).trim().length === 0) {
				fail(file, "the degraded block rendered nothing at all");
			}
		} catch (error) {
			fail(file, `render threw on a degraded block: ${String(error)}`);
		}
	}
}

/* ------------------------------------------------------------------ *
 * The rule itself
 * ------------------------------------------------------------------ */

function hasCopyCommand(id: string): boolean {
	for (const spec of TOML_EXPORTS) {
		if (spec.block.id === id) {
			return true;
		}
	}

	return false;
}

function hasWitness(id: string): boolean {
	return listCorpus("temoins").indexOf(`${id}.toml`) !== -1;
}

/**
 * What `aidd_docs/guidelines/schema-design.md` demands of every format, checked
 * rather than merely written down: a TOML document it can read — proved by a
 * witness that parses — and a copy command that can send it out.
 */
function assertRule(): void {
	for (const block of BRUMES_BLOCKS) {
		if (BLOCKS_IN_DEBT.indexOf(block.id) !== -1) {
			continue;
		}

		if (!hasWitness(block.id)) {
			fail(
				block.id,
				"no witness in corpus/temoins, so nothing proves it reads a schema document",
			);
		}

		if (!hasCopyCommand(block.id)) {
			fail(block.id, "no copy-as-TOML command is declared for it");
		}
	}
}

/**
 * A witness copied as TOML and read back must draw the same thing.
 *
 * This is the round trip the guideline sells: a block leaves the note, lands
 * in Lantern or in another vault, and is still the block it was. Reading and
 * writing can each be right on their own and still disagree — a field written
 * under one name and read under another passes both halves and loses itself
 * in between.
 */
function assertAllerRetour(): void {
	for (const spec of TOML_EXPORTS) {
		const file = `${spec.block.id}.toml`;

		if (!hasWitness(spec.block.id)) {
			continue;
		}

		const source = readFileSync(join(CORPUS, "temoins", file), "utf8");
		const first = spec.block.parse(source);

		if (first === null) {
			// assertTemoins has already said so; nothing to add here.
			continue;
		}

		let second: unknown;

		try {
			second = spec.block.parse(spec.toToml(first));
		} catch (error) {
			fail(file, `the round trip threw: ${String(error)}`);
			continue;
		}

		if (second === null) {
			fail(file, "what the copy command wrote no longer parses");
			continue;
		}

		const before = renderedText(
			spec.block.render(first, doc as unknown as Document) as unknown as El,
		);
		const after = renderedText(
			spec.block.render(second, doc as unknown as Document) as unknown as El,
		);

		if (before !== after) {
			fail(file, "the copy and the original do not draw the same thing");
		}
	}
}

function reportDebt(): void {
	const named: string[] = [];

	for (const block of BRUMES_BLOCKS) {
		if (BLOCKS_IN_DEBT.indexOf(block.id) !== -1) {
			named.push(block.id);
		}
	}

	if (named.length === 0) {
		console.log("debt: none — every block honours the guideline");
		return;
	}

	console.log(`debt: ${named.join(", ")}`);
}

/* ------------------------------------------------------------------ */

// `currentLogLevel` starts at "error" and `shouldLog` compares
// LEVEL_ORDER[currentLogLevel] <= LEVEL_ORDER[level]: a harness that skips this
// measures silence and takes it for a failure.
log.setLevel("warn");

assertTemoins();
assertRefus();
assertRule();
assertAllerRetour();

if (failures.length > 0) {
	for (const failure of failures) {
		console.error(`FAIL ${failure}`);
	}

	console.error(`\n${failures.length} corpus assertion(s) failed.`);
	process.exit(1);
}

reportDebt();
console.log("corpus: green");
