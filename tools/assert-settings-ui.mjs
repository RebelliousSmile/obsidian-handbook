import { readFileSync } from "node:fs";

const source = readFileSync("src/settings/index.ts", "utf8");
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

if (!source.includes('variants.length < 2')) {
	failures.push("The game variant selector is not hidden for packs without choices.");
}

if (!source.includes('.setName("Univers")')) {
	failures.push("The game variant selector has no French-first visible label.");
}

if (!/if \(findGamePack\("adrenaline"\)\) \{[\s\S]*?setHeading\("Adrenaline System"\)/m.test(source)) {
	failures.push("The Adrenaline System section is not gated by the installed game registry.");
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
