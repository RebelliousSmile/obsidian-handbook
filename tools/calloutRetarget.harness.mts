import assert from "node:assert/strict";
import { findCalloutOpening, retargetCallouts, setCalloutType } from "../src/features/callouts/retarget";

const declared = new Set(["action", "exemple", "example"]);
const source = [
	"> [!info] Titre",
	"> corps",
	"",
	"> [!ACTION]+ Garde",
	"> [!warning|video]- Plié",
	"```md",
	"> [!tip] exemple de code",
	"```",
	"> [!Example]",
	"texte [!tip] hors callout",
];
const { lines, changed } = retargetCallouts(source, declared, "action");
assert.equal(changed, 2);
assert.equal(lines[0], "> [!action] Titre");
assert.equal(lines[3], "> [!ACTION]+ Garde", "a declared type is untouched, whatever its case");
assert.equal(lines[4], "> [!action|video]- Plié", "modifiers and fold marker are kept");
assert.equal(lines[6], source[6], "fenced code is skipped");
assert.equal(lines[8], "> [!Example]");
assert.equal(lines[9], source[9]);

assert.equal(findCalloutOpening((index) => source[index] ?? "", 1), 0);
assert.equal(findCalloutOpening((index) => source[index] ?? "", 2), null, "a blank line ends the callout");
assert.equal(setCalloutType("> [!info]+ T", "roller"), "> [!roller]+ T");
const nested = retargetCallouts(
	["~~~md", "```", "> [!tip] still sample", "```", "> [!tip] still sample", "~~~", "> [!tip] real", "> ```", "> [!tip] in a callout fence", "> ```"],
	declared,
	"action",
);
assert.equal(nested.changed, 1, "a shorter or other fence does not close a fence");
assert.equal(nested.lines[6], "> [!action] real");
assert.equal(nested.lines[8], "> [!tip] in a callout fence", "a fence inside a callout is seen");
console.log("callout retarget: ok");
