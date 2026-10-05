import assert from "node:assert/strict";
import {
	FIT_PAGE_HEIGHT,
	FULL_PAGE_RATIO,
	fitScale,
	PRINTABLE_PAGE_HEIGHT,
	takesFullPage,
} from "../src/features/printPageBreaks";

const threshold = PRINTABLE_PAGE_HEIGHT * FULL_PAGE_RATIO;

assert.equal(FULL_PAGE_RATIO, 0.4);
assert.equal(takesFullPage(threshold), true, "the threshold itself takes the page");
assert.equal(takesFullPage(threshold - 1), false, "just under stays in the flow");
assert.equal(takesFullPage(PRINTABLE_PAGE_HEIGHT), true);
assert.equal(takesFullPage(0), false, "an unmeasured block is not promoted");
assert.equal(takesFullPage(500, 1000, 0.6), false, "the ratio is a parameter");

assert.equal(fitScale(FIT_PAGE_HEIGHT), 1, "a block that fits is not scaled");
assert.equal(fitScale(FIT_PAGE_HEIGHT * 2), 0.5, "a taller block shrinks to the room");
assert.equal(fitScale(500, 0), 1, "no room means no scaling");
assert.equal(fitScale(FIT_PAGE_HEIGHT * 20), 1, "an absurd height is a measurement error: the block is not crushed");

console.log("print page breaks: ok");
