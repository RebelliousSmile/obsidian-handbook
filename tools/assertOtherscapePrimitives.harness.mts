import assert from "node:assert/strict";
import {
	asBoolean,
	asInteger,
	asNonNegativeInteger,
	asRecordList,
	asStringList,
	readMeta,
} from "../src/features/blocks/schemaValues";
import { parseOtherscapeDocument } from "../src/features/otherscape/document";
import { OS_BLOCK_IDS, OS_FEATURE_FLAGS } from "../src/features/otherscape/types";

const document = parseOtherscapeDocument(`
title_tag = "Chrome Debt"
power_tags = ["~{spent edge}", "clean signal"]
upgrade = 2
[meta]
source = "Metro"
authors = ["A"]
page = 12
[[references]]
title_tag = "Cold Signal"
category = "RITUAL"
`);
assert.ok(document);
assert.deepEqual(asStringList(document.power_tags), ["~{spent edge}", "clean signal"]);
assert.equal(asNonNegativeInteger(document.upgrade, 3), 2);
assert.equal(asNonNegativeInteger(4, 3), undefined);
assert.equal(asInteger(-2), -2);
assert.equal(asBoolean(false), false);
assert.equal(asBoolean("false"), undefined);
assert.equal(asRecordList(document.references).length, 1);
assert.deepEqual(readMeta(document.meta), {
	source: "Metro",
	authors: ["A"],
	page: 12,
});
assert.equal(parseOtherscapeDocument("title_tag = ["), null);
assert.equal(parseOtherscapeDocument("not toml prose"), null);
assert.equal(asNonNegativeInteger("2", 3), undefined);
assert.equal(Object.values(OS_BLOCK_IDS).length, 6);
assert.equal(Object.values(OS_FEATURE_FLAGS).length, 6);
assert.equal(Object.values(OS_BLOCK_IDS).includes("os-theme-card"), false);

console.log("Otherscape primitive assertions passed.");
