import assert from "node:assert/strict";
import { build } from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const work = mkdtempSync(join(tmpdir(), "handbook-otherscape-theme-"));
const outfile = join(work, "styles.css");

try {
	await build({
		entryPoints: ["src/styles/styles.scss"],
		outfile,
		bundle: true,
		loader: { ".scss": "css" },
		plugins: [sassPlugin({ type: "css" })],
		logLevel: "warning",
	});

	const css = readFileSync(outfile, "utf8");
	for (const root of [
		"brumes-os-theme",
		"brumes-os-profile",
		"brumes-os-creation",
	]) {
		const selector = `.brumes--otherscape .${root}`;
		const declarations = css.match(
			new RegExp(`${selector.replaceAll(".", "\\.")}\\s*\\{([^}]*)\\}`),
		)?.[1];

		assert.ok(declarations, `missing Otherscape card root: ${selector}`);
		assert.match(
			declarations,
			/background:\s*var\(--background-primary-alt\)/,
			`${root} must bind its background to the active Otherscape scheme`,
		);
		assert.match(
			declarations,
			/color:\s*var\(--text-normal\)/,
			`${root} must bind its foreground to the active Otherscape scheme`,
		);
	}

	console.log("Otherscape cards bind foreground and background to their active scheme");
} finally {
	rmSync(work, { recursive: true, force: true });
}
