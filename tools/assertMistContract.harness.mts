import assert from "node:assert/strict";
import { MIST_ENGINE_CODECS } from "schema-in-the-mist";
import { BRUMES_BLOCKS } from "../src/features/blocks/registry";
import { TOML_EXPORTS } from "../src/features/blocks/tomlExports";
import {
	loadMistContractCases,
	MIST_BLOCK_IDS,
	MIST_TARGET_TO_BLOCK,
	MIST_TARGETS,
	mistCaseById,
} from "./mistContractCorpus.mts";

class El {
	textContent = "";
	children: El[] = [];
	dataset: Record<string, string> = {};
	classes: string[] = [];
	classList = { add: (...names: string[]) => this.classes.push(...names) };
	constructor(public tagName: string) {}
	appendChild(child: El): El {
		this.children.push(child);
		return child;
	}
}

const doc = { createElement: (tagName: string) => new El(tagName) };

function renderedText(element: El): string {
	return element.textContent + element.children.map(renderedText).join("");
}

const blocks = new Map(BRUMES_BLOCKS.map((block) => [block.id, block]));
const exportsByBlock = new Map(TOML_EXPORTS.map((spec) => [spec.block.id, spec]));
const cases = loadMistContractCases();

assert.equal(cases.length, 31, "Mist v1.0.0 must expose 31 contract cases");
assert.equal(MIST_TARGETS.length, 14, "Mist must expose 14 public targets");
assert.equal(MIST_BLOCK_IDS.length, 12, "Handbook must keep 12 Mist renderers");

let canonicalAccepted = 0;
let canonicalRejected = 0;
let rendered = 0;
let degraded = 0;
let nullCases = 0;
let validatedOutputs = 0;
const exercisedBlocks = new Set<string>();
const exercisedExports = new Set<string>();

for (const entry of cases) {
	const codec = MIST_ENGINE_CODECS[entry.target];
	assert.ok(codec, `${entry.id}: codec is exported`);

	if (entry.canonical === "accept") {
		const value = codec.parseToml(entry.source);
		assert.deepEqual(
			codec.parseToml(codec.stringifyToml(value as never)),
			value,
			`${entry.id}: canonical semantic round-trip`,
		);
		canonicalAccepted += 1;
	} else {
		assert.throws(
			() => codec.parseToml(entry.source),
			undefined,
			`${entry.id}: canonical rejection expected`,
		);
		canonicalRejected += 1;
	}

	const blockId = MIST_TARGET_TO_BLOCK[entry.target];
	if (entry.handbook === "null") {
		assert.equal(blockId, null, `${entry.id}: no Handbook renderer expected`);
		nullCases += 1;
		continue;
	}

	assert.notEqual(blockId, null, `${entry.id}: Handbook renderer expected`);
	const block = blocks.get(blockId);
	assert.ok(block, `${entry.target}: renderer is registered`);
	let data: unknown;
	assert.doesNotThrow(() => {
		data = block.parse(entry.source);
	}, `${entry.id}: Handbook projection must tolerate the document`);
	exercisedBlocks.add(blockId);

	if (entry.handbook === "degraded" && data === null) {
		assert.ok(
			`Invalid ${blockId} block.`.trim(),
			`${entry.id}: the host fallback must contain text`,
		);
		degraded += 1;
		continue;
	}

	assert.notEqual(data, null, `${entry.id}: Handbook projection returned null`);
	const before = renderedText(
		block.render(data, doc as unknown as Document) as unknown as El,
	);
	assert.ok(before.trim(), `${entry.id}: renderer returned no text`);

	if (entry.handbook === "degraded") {
		degraded += 1;
		continue;
	}

	rendered += 1;
	const exporter = exportsByBlock.get(blockId);
	assert.ok(exporter, `${entry.target}: TOML exporter is registered`);
	const output = exporter.toToml(data);
	codec.parseToml(output);
	const afterData = block.parse(output);
	assert.notEqual(afterData, null, `${entry.id}: exported TOML no longer parses`);
	const after = renderedText(
		block.render(afterData, doc as unknown as Document) as unknown as El,
	);
	assert.equal(after, before, `${entry.id}: exported TOML changed the rendering`);
	exercisedExports.add(blockId);
	validatedOutputs += 1;
}

const extensions = MIST_ENGINE_CODECS["city-of-mist/danger"].parseToml(
	mistCaseById(cases, "city-danger-extensions").source,
);
assert.equal(extensions.rating, 0, "zero must survive canonical parsing");
assert.equal(
	extensions.spectrums?.[0]?.is_immune,
	false,
	"false must survive canonical parsing",
);
assert.deepEqual(extensions.soft_moves, [], "empty lists must survive parsing");
assert.equal(
	"name" in (extensions.custom_moves?.[0] ?? {}),
	false,
	"absent optional fields must stay absent",
);
assert.deepEqual(
	MIST_ENGINE_CODECS["legend-in-the-mist/challenge"].parseToml(
		mistCaseById(cases, "litm-challenge-secrets").source,
	).roles,
	[],
	"empty nested lists must survive parsing",
);

assert.equal(exercisedBlocks.size, 12, "all 12 Mist renderers must be exercised");
assert.equal(exercisedExports.size, 12, "all 12 Mist exporters must be exercised");

console.log(
	`Mist contract: ${cases.length} cases, ${MIST_TARGETS.length} targets, ` +
		`${canonicalAccepted} accepted, ${canonicalRejected} rejected, ` +
		`${rendered} rendered, ${degraded} degraded, ${nullCases} null, ` +
		`${validatedOutputs} Handbook outputs validated.`,
);
