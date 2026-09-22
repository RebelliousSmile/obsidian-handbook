import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/* Why this exists: every CI run failed for weeks on `npm ci` with no package-lock.json to install
   from, and nothing in the repo could notice — the workflows are the one part of the build that never
   runs locally. This asserts what a clean checkout has, so a green local check means a green CI run. */

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
assert.ok(
	typeof packageJson.packageManager === "string" && packageJson.packageManager.indexOf("pnpm@") === 0,
	"package.json must declare its pnpm version: pnpm/action-setup resolves the installer from this field",
);

const tracked = "pnpm-lock.yaml";
readFileSync(tracked, "utf8");

/* A lockfile that is not committed cannot be read by CI, whatever it proves on a developer machine. */
const untracked = "package-lock.json";
for (const entry of readdirSync("tools")) {
	if (!entry.endsWith(".mjs") && !entry.endsWith(".mts")) continue;
	const source = readFileSync(join("tools", entry), "utf8");
	assert.equal(
		source.indexOf(`readFileSync("${untracked}"`),
		-1,
		`tools/${entry} reads ${untracked}, which no clean checkout carries`,
	);
}

const workflows = join(".github", "workflows");
let installs = 0;
for (const entry of readdirSync(workflows)) {
	if (!entry.endsWith(".yml") && !entry.endsWith(".yaml")) continue;
	const source = readFileSync(join(workflows, entry), "utf8");
	const lines = source.split("\n").filter((line) => line.indexOf("run:") >= 0);
	for (const line of lines) {
		assert.equal(
			/\bnpm (ci|install|run)\b/.test(line),
			false,
			`${entry} drives npm: this repo tracks only ${tracked}, so pnpm is its only installer`,
		);
		if (line.indexOf("pnpm install") >= 0) {
			assert.ok(
				line.indexOf("--frozen-lockfile") >= 0,
				`${entry} installs without --frozen-lockfile: CI would silently accept a stale lockfile`,
			);
			installs += 1;
		}
	}
	if (source.indexOf("pnpm") >= 0) {
		assert.ok(
			source.indexOf("pnpm/action-setup") >= 0,
			`${entry} runs pnpm without installing it first`,
		);
		/* A checkout redirected with `path:` moves package.json out of the workspace root, where the
		   actions still look by default. `pnpm/action-setup` then resolves no version at all and the
		   job dies before the first install — the failure this file exists to make impossible. */
		const checkout = /actions\/checkout@[\s\S]*?\bpath:\s*(\S+)/.exec(source);
		if (checkout) {
			const root = checkout[1];
			assert.ok(
				source.indexOf(`package_json_file: ${root}/package.json`) >= 0,
				`${entry} checks out into ${root}/ but lets pnpm/action-setup read packageManager from ` +
					`the workspace root, which that checkout leaves empty`,
			);
			for (const line of source.split("\n")) {
				const cache = /cache-dependency-path:\s*(\S+)/.exec(line);
				if (cache) {
					assert.ok(
						cache[1].indexOf(`${root}/`) === 0,
						`${entry} caches on ${cache[1]}, which is outside the ${root}/ checkout`,
					);
				}
			}
		}
	}
}
assert.ok(installs >= 2, `only ${installs} workflow installs dependencies with pnpm, expected the check and the release`);

const ci = readFileSync(join(workflows, "ci.yml"), "utf8");
for (const command of [
	"pnpm check",
	"pnpm assert:adrenaline-source",
	"pnpm e2e:layout-regions:linux",
	"pnpm e2e:request-url",
	"tools/e2e/layout-regions-journey.ps1",
]) {
	assert.ok(ci.includes(command), `CI does not run ${command} on pull requests`);
}

console.log(`CI install passed: ${installs} pnpm installs, ${tracked} is the only lockfile any of them needs.`);
