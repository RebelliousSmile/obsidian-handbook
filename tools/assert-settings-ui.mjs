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
