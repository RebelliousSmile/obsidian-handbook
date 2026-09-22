import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lanternPackage = process.argv[2] ?? resolve(root, "../lantern/package.json");
const handbook = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const lantern = JSON.parse(readFileSync(lanternPackage, "utf8"));

function releasedVersion(pkg, name) {
	const url = pkg.dependencies?.[name];
	assert.equal(typeof url, "string", `${pkg.name}: ${name} pin is missing`);
	const match = url.match(new RegExp(`^https://github\\.com/RebelliousSmile/${name}/releases/download/v(\\d+\\.\\d+\\.\\d+)/${name}-\\1\\.tgz$`));
	assert.ok(match, `${pkg.name}: ${name} must point to a versioned public release asset`);
	return match[1];
}

const handbookAdrenaline = releasedVersion(handbook, "schema-adrenaline");
const lanternAdrenaline = releasedVersion(lantern, "schema-adrenaline");
assert.equal(
	handbookAdrenaline.split(".")[0],
	lanternAdrenaline.split(".")[0],
	`schema-adrenaline major differs: Handbook ${handbookAdrenaline}, Lantern ${lanternAdrenaline}`,
);
assert.equal(
	releasedVersion(handbook, "schema-in-the-mist"),
	releasedVersion(lantern, "schema-in-the-mist"),
	"schema-in-the-mist release differs between Handbook and Lantern",
);
console.log(`Consumer schema pins agree: Adrenaline ${handbookAdrenaline}/${lanternAdrenaline}, Mist ${releasedVersion(handbook, "schema-in-the-mist")}.`);
