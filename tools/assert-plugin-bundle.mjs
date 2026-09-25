import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function assertPluginBundle(source, filename = "dist/main.js") {
	if (/\bimport\.meta(?:\.url)?\b/.test(source)) {
		throw new Error(`${filename}: CommonJS plugin bundle retains import.meta; use a host-safe provider entry point`);
	}
	for (const match of source.matchAll(/\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*\{\s*\}/g)) {
		const name = match[1];
		const nearby = source.slice(match.index, match.index + 4096);
		const urlCall = new RegExp(`new\\s+URL\\s*\\([^)]*,\\s*${name}\\.url\\s*\\)`);
		if (urlCall.test(nearby)) {
			throw new Error(`${filename}:${match.index}: CommonJS bundle contains new URL(..., ${name}.url) after import.meta became an empty object; fix the provider root export`);
		}
	}
	if (/new\s+URL\s*\([^)]*,\s*(?:undefined|void\s+0)\s*\)/.test(source)) {
		throw new Error(`${filename}: CommonJS bundle contains new URL with an undefined module base`);
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const filename = process.argv[2] ?? "dist/main.js";
	assertPluginBundle(readFileSync(filename, "utf8"), filename);
	console.log(`Plugin bundle guard passed: ${filename}`);
}
