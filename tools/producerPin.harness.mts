/**
 * The producer pin guard: what a producer's workflows pin of Handbook against
 * what its packs require, read as the supervisor reads it. Pure functions, no
 * repository: the readers of Handbook are injected.
 */
import assert from "node:assert/strict";
import { declaredCapabilities, pinnedHandbookRefs, producerPinProblems, requiredCapabilities } from "./supervisor/producerPin.mjs";

const OLD = "a".repeat(40);
const NEW = "b".repeat(40);
const workflow = (ref: string) => `jobs:\n  check:\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          repository: RebelliousSmile/obsidian-handbook\n          ref: ${ref}\n          path: obsidian-handbook\n`;
const manifest = (...requires: string[]) => JSON.stringify({ requires });
const source = (...capabilities: string[]) => `export const X = [${capabilities.map((capability) => `"${capability}"`).join(", ")}];`;
const handbook = (known: Record<string, string | null>) => ({ head: NEW, capabilitiesAt: (ref: string) => known[ref] ?? null });

assert.deepEqual(pinnedHandbookRefs(workflow(OLD).replace(/\n/g, "\r\n")), [OLD], "a CRLF workflow is read");
assert.deepEqual(pinnedHandbookRefs("uses: actions/checkout@v4\nwith:\n  repository: someone/else\n  ref: x\n"), [], "another repository is not a pin");
assert.deepEqual(pinnedHandbookRefs(workflow("${{ inputs.ref }}")), [], "a computed ref is no fixed pin");
assert.deepEqual([...declaredCapabilities(source("block:a-b", "style:c"))].sort(), ["block:a-b", "style:c"]);
assert.deepEqual([...requiredCapabilities(["not json", manifest("block:x", "style:y"), JSON.stringify({})])].sort(), ["block:x", "style:y"]);

// Happy path: the pinned Handbook declares everything the packs require.
assert.deepEqual(producerPinProblems({ id: "p", workflows: { "ci.yml": workflow(NEW), "release.yml": workflow(NEW) }, manifests: [manifest("block:x")], handbook: handbook({ [NEW]: source("block:x") }) }), []);

// A pin behind the packs: the refusal names the capability, the files and the candidate.
const lagging = producerPinProblems({ id: "p", workflows: { "ci.yml": workflow(OLD) }, manifests: [manifest("block:x", "block:y")], handbook: handbook({ [OLD]: source("block:x") }) });
assert.equal(lagging.length, 1);
assert.match(lagging[0], /block:y/);
assert.doesNotMatch(lagging[0], /block:x,/);
assert.match(lagging[0], /ci\.yml/);
assert.ok(lagging[0].includes(NEW.slice(0, 10)), "the candidate is named");

// Two workflows on two commits: both are named, and the lagging one is refused.
const diverging = producerPinProblems({ id: "p", workflows: { "ci.yml": workflow(NEW), "release.yml": workflow(OLD) }, manifests: [manifest("block:y")], handbook: handbook({ [NEW]: source("block:y"), [OLD]: source("block:x") }) });
assert.ok(diverging.some((problem) => problem.includes("different Handbook commits") && problem.includes("ci.yml") && problem.includes("release.yml")));
assert.ok(diverging.some((problem) => /release\.yml/.test(problem) && problem.includes("block:y")));

// A commit Handbook does not have is a refusal in itself.
const unknown = producerPinProblems({ id: "p", workflows: { "ci.yml": workflow(OLD) }, manifests: [manifest("block:x")], handbook: handbook({}) });
assert.equal(unknown.length, 1);
assert.match(unknown[0], /does not have/);

// A producer that pins no Handbook is out of scope.
assert.deepEqual(producerPinProblems({ id: "p", workflows: { "ci.yml": "jobs: {}\n" }, manifests: [manifest("block:x")], handbook: handbook({}) }), []);

console.log("producer pin guard: ok");
