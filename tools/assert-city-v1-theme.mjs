import assert from "node:assert/strict";
import { build } from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const work = mkdtempSync(join(tmpdir(), "handbook-city-v1-theme-"));
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
	const workspace = ".brumes--city-of-mist.brumes--workspace-theme";

	// The two general schemes carried by the v1 theme. The explicit Handbook
	// class sits beside the Obsidian-following selector, while :not() prevents
	// the vault's opposite polarity from winning when a scheme is forced.
	assert.match(
		css,
		new RegExp(
			`${workspace.replaceAll(".", "\\.")}\\.theme-light:not\\(\\.brumes--colour-dark\\)[^{]*,\\s*${workspace.replaceAll(".", "\\.")}\\.brumes--colour-light`,
		),
	);
	assert.match(
		css,
		new RegExp(
			`${workspace.replaceAll(".", "\\.")}\\.theme-dark:not\\(\\.brumes--colour-light\\)[^{]*,\\s*${workspace.replaceAll(".", "\\.")}\\.brumes--colour-dark`,
		),
	);

	for (const declaration of [
		"--background-primary: #f2f2f0",
		"--background-secondary: #f2f0eb",
		"--ribbon-background: #382859",
		"--background-primary: #2d2040",
		"--background-secondary: #382859",
		"--ribbon-background: rgb(34, 22, 46)",
		"--titlebar-background-focused: hsl(260, 38%, 24%)",
		"--divider-color-hover: #e6007e",
		"--radius-s: 0px",
	]) {
		assert.ok(css.includes(declaration), `missing v1 declaration: ${declaration}`);
	}

	assert.match(
		css,
		/\.brumes--city-of-mist\.theme-dark:not\(\.brumes--colour-light\) \.brumes-com-danger[^{]*,\s*\.brumes--city-of-mist\.brumes--colour-dark \.brumes-com-danger/,
	);

	console.log("City of Mist v1 general light and dark themes are preserved");
} finally {
	rmSync(work, { recursive: true, force: true });
}
