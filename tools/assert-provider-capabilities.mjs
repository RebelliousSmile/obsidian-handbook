import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const built = buildSync({ entryPoints: [resolve(root, "src/games/capabilities.ts")], bundle: true, platform: "node", format: "esm", write: false });
const support = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].contents).toString("base64")}`);
const portable = [...support.PORTABLE_GAME_PLUGIN_SUPPORT.blocks, ...support.PORTABLE_GAME_PLUGIN_SUPPORT.styles, ...support.PORTABLE_GAME_PLUGIN_SUPPORT.presentations];
const expected = {
	"schema-pbta": portable,
	"schema-in-the-mist": ["render:mist"],
	"schema-adrenaline": ["render:adrenaline"],
};

assert.deepEqual([...support.DOCUMENT_RENDER_CAPABILITIES].sort(), ["render:adrenaline", "render:mist"]);
for (const [provider, tokens] of Object.entries(expected)) {
	const sourceRoot = resolve(root, "..", provider);
	const descriptorPath = resolve(sourceRoot, "cross-tool-provider.json");
	const descriptor = JSON.parse(readFileSync(descriptorPath, "utf8"));
	assert.equal(descriptor.provider, provider, `${descriptorPath}: provider identity`);
	assert.equal(descriptor.providerVersion, 1, `${descriptorPath}: provider version`);
	const published = descriptor.capabilities?.handbook;
	assert.ok(Array.isArray(published), `${descriptorPath}: capabilities.handbook is missing`);
	assert.deepEqual([...published].sort(), [...tokens].sort(), `${descriptorPath}: declared Handbook capabilities differ from implemented support`);
}
console.log("All three provider descriptors agree with Handbook capabilities.");
