import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const work = await mkdtemp(join(tmpdir(), "handbook-adrenaline-documents-"));
const output = join(work, "assert.mjs");

try {
	await build({
		entryPoints: ["tools/assertAdrenalineDocuments.harness.mts"],
		bundle: true,
		platform: "node",
		format: "esm",
		outfile: output,
		logLevel: "silent",
	});
	await import(pathToFileURL(output).href);
} finally {
	await rm(work, { recursive: true, force: true });
}
