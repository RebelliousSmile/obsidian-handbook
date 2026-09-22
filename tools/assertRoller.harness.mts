import assert from "node:assert/strict";
import { parseRoller } from "../src/features/rollers/parser";
import { rollTable } from "../src/features/rollers/roll";

const ordinary = parseRoller(`| Result |
| --- |
| First |
| Second |`);
assert.ok(ordinary, "an ordinary roller table parses");
assert.equal(ordinary.table.lookupFormula, null);
assert.equal(ordinary.table.rows.length, 2);

const lookup = parseRoller(`| dice: 1d6 | Result |
| --- | --- |
| 1-3 | Low |
| 4–6 | High |`);
assert.ok(lookup, "a lookup roller table parses");
assert.equal(lookup.table.lookupFormula, "1d6");
assert.equal(await rollTable({
	getRoller: async () => ({ roll: async () => undefined, result: 5 }),
}, lookup), "High");

assert.equal(parseRoller("No table."), null, "a roller without a table is rejected");
assert.equal(parseRoller(`| A |
| --- |
| A |

| B |
| --- |
| B |`), null, "a roller with multiple tables is rejected");
assert.equal(await rollTable({
	getArrayRoller: async () => ({ roll: async () => undefined, results: ["Second"] }),
}, ordinary), "Second");

console.log("Roller assertions passed.");
