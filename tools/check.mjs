import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
	readFileSync(resolve(root, "package.json"), "utf8"),
);
const externalSchemaAssertions = new Set([
	"assert:adrenaline-source",
	"assert:adrenaline-theme",
]);
const commands = [
	"build",
	"lint",
	...Object.keys(packageJson.scripts)
		.filter(
			(name) =>
				name.startsWith("assert:") &&
				!externalSchemaAssertions.has(name),
		)
		.sort(),
];
const npmCli = process.env.npm_execpath;

for (const command of commands) {
	console.log(`\n> check: ${command}`);
	const result = npmCli
		? spawnSync(process.execPath, [npmCli, "run", command], {
			cwd: root,
			env: process.env,
			stdio: "inherit",
		})
		: spawnSync("npm", ["run", command], {
		cwd: root,
		env: process.env,
		stdio: "inherit",
		});
	if (result.error) throw result.error;
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

console.log("\nHandbook core check passed.");
