import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const directory = await mkdtemp(join(tmpdir(), "handbook-roller-"));
const output = join(directory, "assert-roller.mjs");
try {
	await build({ entryPoints: ["tools/assertRoller.harness.mts"], bundle: true, platform: "node", format: "esm", outfile: output, logLevel: "silent" });
	await import(pathToFileURL(output).href);
} finally {
	await rm(directory, { recursive: true, force: true });
}
