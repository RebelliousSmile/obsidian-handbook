import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { writeObsidianStub } from "./obsidianStub.mjs";

const temporaryDirectory = await mkdtemp(join(tmpdir(), "handbook-mode-sections-"));
const output = join(temporaryDirectory, "assert-mode-sections.mjs");

try {
	const stub = await writeObsidianStub(temporaryDirectory);
	await build({
		entryPoints: ["tools/modeSections.harness.mts"],
		bundle: true,
		platform: "node",
		format: "esm",
		outfile: output,
		logLevel: "silent",
		alias: { obsidian: stub },
	});
	await import(pathToFileURL(output).href);
} finally {
	await rm(temporaryDirectory, { recursive: true, force: true });
}
