import assert from "node:assert/strict";
import { pbtaPlaybookBlock } from "../src/features/pbta/block";
import { loadPbtaSpecializedPlaybookCases } from "./pbtaContractCorpus.mts";

class El {
	textContent = "";
	children: El[] = [];
	dataset: Record<string, string> = {};
	classes: string[] = [];
	classList = { add: (...names: string[]) => this.classes.push(...names) };
	constructor(public tagName: string) {}
	appendChild(child: El): El { this.children.push(child); return child; }
}
const doc = { createElement: (tagName: string) => new El(tagName) };
function text(node: El): string { return node.textContent + node.children.map(text).join(""); }
const requiredMechanicalField: Record<string, string> = {
	"masks-playbook": "momentOfTruth",
	"monster-of-the-week-playbook": "improvements",
	"monsterhearts-playbook": "strings",
	"urban-shadows-playbook": "corruption",
	"the-sprawl-playbook": "directives",
};

/* A witness may legitimately omit an optional mechanic (monsterhearts' `strings`), so the field is
   required of the target, not of every witness: a target whose mechanics never render still fails. */
const mechanicsSeen = new Set<string>();
const targetsSeen = new Set<string>();
for (const entry of loadPbtaSpecializedPlaybookCases()) {
	const parsed = pbtaPlaybookBlock.parse(entry.source);
	assert.ok(parsed, `${entry.target} must parse`);
	assert.equal(parsed.target, entry.target);
	const rendered = pbtaPlaybookBlock.render(parsed, doc as unknown as Document) as unknown as El;
	const output = text(rendered);
	const data = parsed.data as unknown as Record<string, unknown>;
	const editorial = data.editorial as Record<string, { heading: string }>;
	for (const key of Object.keys(editorial)) assert.ok(output.includes(editorial[key].heading), `${entry.target} editorial ${key} is visible`);
	targetsSeen.add(entry.target);
	const field = requiredMechanicalField[entry.target];
	const declared = Object.prototype.hasOwnProperty.call(parsed.data as object, field);
	assert.equal(output.includes(field), declared, `${entry.path}: ${field} renders only when the document declares it`);
	if (declared) mechanicsSeen.add(entry.target);
}
for (const target of targetsSeen) {
	assert.ok(mechanicsSeen.has(target), `no witness renders ${requiredMechanicalField[target]} for ${target}`);
}
console.log(`Specialized PbtA playbook projections passed: ${targetsSeen.size} targets render their mechanics.`);
