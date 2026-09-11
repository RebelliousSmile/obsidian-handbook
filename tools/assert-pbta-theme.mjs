import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const page = readFileSync(join("src", "styles", "pbta", "_page.scss"), "utf8");
const modes = readFileSync(join("src", "styles", "pbta", "index.scss"), "utf8");
const entry = readFileSync(join("src", "styles", "styles.scss"), "utf8");

assert.match(entry, /@use "pbta\/index\.scss"/);
assert.match(modes, /\.brumes--urban-shadows/);
assert.match(modes, /\.brumes--monsterhearts/);
assert.match(modes, /\.brumes--variant-drowned-lake/);
assert.match(modes, /-webkit-text-stroke: 1px var\(--drowned-lake-title-outline\)/);
assert.match(modes, /\.cm-table-widget table/);
assert.match(modes, /var\(--monsterhearts-table-rule/);
assert.match(modes, /text-transform: uppercase/);
assert.match(modes, /var\(--brumes-image-game-mark\)/);
assert.match(modes, /var\(--brumes-image-variant-mark\)/);
assert.match(modes, /\.markdown-preview-sizer::before/);
assert.match(modes, /\.cm-sizer::before/);
assert.match(modes, /font-family: var\(--monsterhearts-title-font/);
assert.match(modes, /color: var\(--monsterhearts-title-ink/);
assert.match(page, /@media \(min-width: 720px\)/);
assert.match(page, /markdown-reading-view:not\(\.pbta-one-column\)/);
assert.match(page, /column-count: 2/);
assert.match(page, /column-gap: var\(--pbta-column-gap/);
assert.match(page, /column-rule: 1px solid var\(--pbta-column-rule/);
assert.match(page, /:is\(\.inline-title, h1\)/);
assert.match(page, /\.callout \.callout-content/);
assert.match(page, /color: var\(--pbta-callout-ink, var\(--text-normal\)\)/);
assert.doesNotMatch(`${page}\n${modes}`, /#[0-9a-f]{3,8}/i);

console.log("PbtA editorial theme assertions passed.");
