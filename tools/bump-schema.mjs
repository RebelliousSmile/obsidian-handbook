import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* Moves one schema pin to a published release: package.json, then the lockfile. It is what the
   `Bump schema` workflow runs when a provider publishes, so a pin is never retyped by hand and
   never points anywhere but a versioned public release asset. */

const PROVIDERS = ["schema-adrenaline", "schema-in-the-mist", "schema-pbta"];
const TAG = /^v(\d+\.\d+\.\d+)(?:-rc\.\d+)?$/;

/** The canonical asset URL of `tag`: a candidate archive carries the final version. */
export function releaseAssetUrl(name, tag) {
	assert.ok(PROVIDERS.includes(name), `unknown schema package: ${String(name)}`);
	const match = TAG.exec(tag);
	assert.ok(match, `tag must be vX.Y.Z or vX.Y.Z-rc.N, found ${String(tag)}`);
	return `https://github.com/RebelliousSmile/${name}/releases/download/${tag}/${name}-${match[1]}.tgz`;
}

/** package.json with `name` pinned to `url`, every other byte kept. */
export function withPin(source, name, url) {
	const current = JSON.parse(source).dependencies?.[name];
	assert.equal(typeof current, "string", `package.json does not pin ${name}`);
	const line = `"${name}": "${current}"`;
	assert.ok(source.includes(line), `package.json pins ${name} in an unexpected form`);
	return source.replace(line, `"${name}": "${url}"`);
}

async function main() {
	const [name, tag] = process.argv.slice(2);
	const url = releaseAssetUrl(name, tag);
	const response = await fetch(url, { method: "HEAD" });
	assert.ok(response.ok, `${url} is not published: ${response.status}`);

	const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
	const file = resolve(root, "package.json");
	const source = readFileSync(file, "utf8");
	const next = withPin(source, name, url);
	if (next === source) {
		console.log(`${name} is already pinned to ${tag}.`);
		return;
	}
	writeFileSync(file, next);

	// The one install allowed to rewrite the lockfile; the workflow then installs frozen.
	const install = spawnSync("pnpm", ["install", "--lockfile-only", "--ignore-scripts"], {
		cwd: root,
		stdio: "inherit",
		shell: process.platform === "win32",
	});
	if (install.error) throw install.error;
	assert.equal(install.status, 0, "pnpm could not resolve the new pin");
	console.log(`${name} pinned to ${tag}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await main();
}
