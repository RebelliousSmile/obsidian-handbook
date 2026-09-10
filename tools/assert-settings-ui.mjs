import { readFileSync } from "node:fs";

const source = readFileSync("src/settings/index.ts", "utf8");
const sourceModal = readFileSync("src/settings/sourceModal.ts", "utf8");
const plugin = readFileSync("src/BrumesPlugin.ts", "utf8");
const richDescriptions = [
	"createMigrationDescription",
	"createOverrideDescription",
	"createAssetDescription",
	"createIcebergDescription",
	"createMountainDescription",
];

const failures = [];

if (!source.includes("this.renderGameVariant(generalSection)")) {
	failures.push("The general settings do not render the conditional game variant selector.");
}

if (!/if \(GAME_PACKS\.length === 0\) \{\s*drop\.addOption\("none", "No game installed"\);\s*\}/m.test(source)) {
	failures.push("The empty game option remains visible after real packs are installed.");
}

if (!source.includes('button.buttonEl.classList.add("mod-warning")') || !source.includes('setButtonText("Remove")') || !source.includes("SchemaSourceRemovalModal")) {
	failures.push("Registered schema sources have no warning-styled removal action.");
}

if (!sourceModal.includes('setTitle("Remove schema source")') || !sourceModal.includes("all of its installed game packs")) {
	failures.push("Schema source removal is not confirmed with its installed-pack impact.");
}

if (!plugin.includes("removeSchemaSourceStorage(this, source.id)") || !plugin.includes("await this.refreshGameRegistry()")) {
	failures.push("Removing a schema source does not delete its storage and rebuild the live game registry.");
}

if (!source.includes('variants.length < 2')) {
	failures.push("The game variant selector is not hidden for packs without choices.");
}

if (!source.includes('.setName("Univers")')) {
	failures.push("The game variant selector has no French-first visible label.");
}

for (const game of ["city-of-mist", "legend-in-the-mist", "otherscape", "adrenaline"]) {
	if (!source.includes(`this.plugin.settings.mode === "${game}" && findGamePack("${game}")`)) {
		failures.push(`The ${game} settings section remains visible while another game is active.`);
	}
}

if (!/entry\.scope !== "all" && entry\.scope !== this\.plugin\.settings\.mode[\s\S]*?continue;/m.test(source)) {
	failures.push("Callouts scoped to inactive games remain visible in settings.");
}

for (const flag of [
	"adrenalinePjParser",
	"adrenalinePnjParser",
	"adrenalineMonsterParser",
]) {
	if (!source.includes(flag)) {
		failures.push(`The settings tab does not expose ${flag}.`);
	}
}

for (const factory of richDescriptions) {
	const unsafe = new RegExp(
		`\\.setDesc\\(\\s*this\\.${factory}\\(\\)\\s*\\)`,
		"m",
	);
	const directAppend = new RegExp(
		`setting\\.descEl\\.append\\(\\s*this\\.${factory}\\(\\)\\s*\\)`,
		"m",
	);

	if (unsafe.test(source)) {
		failures.push(
			`${factory} is passed to setDesc(), which renders as [object DocumentFragment] in Obsidian.`,
		);
	}

	if (!directAppend.test(source)) {
		failures.push(
			`${factory} is not appended directly to the setting description element.`,
		);
	}
}

if (failures.length > 0) {
	console.error(failures.join("\n"));
	process.exitCode = 1;
} else {
	console.log("Rich setting descriptions are appended as DOM fragments.");
}
