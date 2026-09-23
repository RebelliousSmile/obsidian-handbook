import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, posix } from "node:path";

const require = createRequire(import.meta.url);
const stylesheet = readFileSync(new URL("../dist/styles.css", import.meta.url), "utf8");
const bytes = Buffer.byteLength(stylesheet);
assert.ok(bytes < 150_000, `dist/styles.css is ${bytes} bytes; expected below 150,000`);
assert.ok(!/@font-face\b|data:font\b/i.test(stylesheet), "the plugin stylesheet still embeds font faces");

let totalResources = 0;
for (const id of ["city-of-mist", "legend-in-the-mist", "otherscape"]) {
	const manifestPath = require.resolve(`schema-in-the-mist/handbook/${id}/pack.json`);
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	const assets = manifest.pack.assets;
	const resources = new Set(assets.resources ?? []);
	assert.deepEqual([...resources].sort(), [
		"styles/fonts/averia-serif-libre-latin-700-normal.woff2",
		"styles/fonts/im-fell-english-latin-400-normal.woff2",
	], `${id}: must publish exactly the two-face WOFF2 contract`);
	const fontsSheet = assets.stylesheets.find((file) => file === "styles/fonts.css");
	assert.ok(fontsSheet, `${id}: no declared font stylesheet`);
	assert.ok(resources.size > 0, `${id}: no declared font files`);
	const css = readFileSync(join(dirname(manifestPath), assets.root ?? "assets", fontsSheet), "utf8");
	assert.match(css, /@font-face\b/, `${id}: no CSS font faces`);
	for (const [, , url] of css.matchAll(/url\(\s*(['"]?)([^'"\s)]+)\1\s*\)/gi)) {
		const resource = posix.join(posix.dirname(fontsSheet), url);
		assert.ok(resources.has(resource), `${id}: undeclared font URL ${resource}`);
		assert.ok(statSync(join(dirname(manifestPath), assets.root ?? "assets", resource)).size > 0, `${id}: empty font ${resource}`);
	}
	totalResources += resources.size;
}

assert.equal(totalResources, 6, "the three Mist packs should carry the two-face WOFF2 contract");
console.log(`Mist font packs: ${totalResources} files; plugin stylesheet: ${bytes} bytes.`);
