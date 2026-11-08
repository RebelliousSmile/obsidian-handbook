import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, posix } from "node:path";

const require = createRequire(import.meta.url);
const stylesheet = readFileSync(new URL("../dist/styles.css", import.meta.url), "utf8");
const bytes = Buffer.byteLength(stylesheet);
assert.ok(bytes < 165_000, `dist/styles.css is ${bytes} bytes; expected below 165,000`);
assert.ok(!/@font-face\b|data:font\b/i.test(stylesheet), "the plugin stylesheet still embeds font faces");

/* The two Mist packs share the two-face contract. Otherscape leaves it: its books use
   seven families, so the pack publishes the OFL faces of the book and the OFL look-alikes
   of its commercial faces, each behind the book's own face in a `local()` stack. */
const TWO_FACES = [
	"styles/fonts/averia-serif-libre-latin-700-normal.woff2",
	"styles/fonts/im-fell-english-latin-400-normal.woff2",
];
const PACK_FACES = {
	"city-of-mist": TWO_FACES,
	"legend-in-the-mist": TWO_FACES,
	otherscape: [
		"styles/fonts/barlow-condensed-latin-300-normal.woff2",
		"styles/fonts/familjen-grotesk-latin-500-normal.woff2",
		"styles/fonts/fira-sans-extra-condensed-latin-800-normal.woff2",
		"styles/fonts/ibm-plex-sans-condensed-400-italic.woff2",
		"styles/fonts/ibm-plex-sans-condensed-400-normal.woff2",
		"styles/fonts/ibm-plex-sans-condensed-700-normal.woff2",
		"styles/fonts/sofia-sans-semi-condensed-latin-400-italic.woff2",
		"styles/fonts/sofia-sans-semi-condensed-latin-400-normal.woff2",
		"styles/fonts/sofia-sans-semi-condensed-latin-700-normal.woff2",
		"styles/fonts/space-mono-latin-400-normal.woff2",
	],
};

let totalResources = 0;
let expectedResources = 0;
for (const [id, faces] of Object.entries(PACK_FACES)) {
	const manifestPath = require.resolve(`schema-in-the-mist/handbook/${id}/pack.json`);
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	const assets = manifest.pack.assets;
	const resources = new Set(assets.resources ?? []);
	assert.deepEqual([...resources].sort(), faces, `${id}: must publish exactly its declared WOFF2 faces`);
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
	expectedResources += faces.length;
}

assert.equal(totalResources, expectedResources, "the Mist packs should carry exactly their declared WOFF2 faces");
console.log(`Mist font packs: ${totalResources} files; plugin stylesheet: ${bytes} bytes.`);
