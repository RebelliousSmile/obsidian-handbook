import { build } from "esbuild";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const directory = await mkdtemp(join(tmpdir(), "handbook-roller-"));
const output = join(directory, "assert-roller.mjs");
const obsidian = join(directory, "obsidian.mjs");
try {
	await writeFile(obsidian, "export const eventMenus = [];\nexport class Menu { constructor() { this.titles = []; } static forEvent(event) { const menu = new Menu(); eventMenus.push({ event, menu }); return menu; } addItem(configure) { const item = { setTitle: (title) => { this.titles.push(title); return item; }, setIcon: () => item, onClick: () => item }; configure(item); } showAtMouseEvent() {} }\nexport function getLanguage() { return 'en'; }\nexport class Notice { constructor() {} }\n");
	await build({ entryPoints: ["tools/assertRoller.harness.mts"], bundle: true, platform: "node", format: "esm", outfile: output, alias: { obsidian }, logLevel: "silent" });
	await import(pathToFileURL(output).href);
} finally {
	await rm(directory, { recursive: true, force: true });
}
