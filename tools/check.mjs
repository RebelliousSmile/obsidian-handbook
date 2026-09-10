import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedSchemaRevision = readFileSync(
	resolve(root, "compat/schema-adrenaline.ref"),
	"utf8",
).trim();
const schemaRoot = resolve(
	process.env.SCHEMA_ADRENALINE_ROOT ?? resolve(root, "../schema-adrenaline"),
);
const packPath = resolve(schemaRoot, "handbook/adrenaline/pack.json");

if (!existsSync(packPath)) {
	throw new Error(
		`Adrenaline source is missing at ${packPath}. Set SCHEMA_ADRENALINE_ROOT to the pinned schema-adrenaline checkout.`,
	);
}

const git = spawnSync("git", ["-C", schemaRoot, "rev-parse", "HEAD"], {
	encoding: "utf8",
});
if (git.status !== 0) {
	throw new Error(`Cannot identify schema-adrenaline checkout: ${git.stderr.trim()}`);
}
const actualSchemaRevision = git.stdout.trim();
if (actualSchemaRevision !== expectedSchemaRevision) {
	throw new Error(
		`schema-adrenaline revision mismatch: expected ${expectedSchemaRevision}, got ${actualSchemaRevision}`,
	);
}

const packageJson = JSON.parse(
	readFileSync(resolve(root, "package.json"), "utf8"),
);
const commands = [
	"build",
	"lint",
	...Object.keys(packageJson.scripts)
		.filter((name) => name.startsWith("assert:"))
		.sort(),
];

for (const command of commands) {
	console.log(`\n> check: ${command}`);
	const result = spawnSync("npm", ["run", command], {
		cwd: root,
		env: { ...process.env, SCHEMA_ADRENALINE_ROOT: schemaRoot },
		stdio: "inherit",
	});
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

console.log(
	`\nHandbook check passed against schema-adrenaline ${expectedSchemaRevision}.`,
);
