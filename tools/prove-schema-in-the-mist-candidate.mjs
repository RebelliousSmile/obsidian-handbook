import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function run(script) { const result = spawnSync(process.execPath, [script], { encoding: "utf8" }); if (result.status !== 0) throw new Error(`${script} failed: ${result.stderr || result.stdout}`); }

export function proveSchemaInTheMistCandidate({ releaseUrl, integrity, finalTag }) {
	if (!releaseUrl.startsWith("https://github.com/RebelliousSmile/schema-in-the-mist/releases/download/") || !releaseUrl.endsWith(".tgz")) throw new Error("candidate release URL is not a stable schema-in-the-mist release asset");
	const version = /schema-in-the-mist-(\d+\.\d+\.\d+)\.tgz$/.exec(releaseUrl)?.[1];
	if (!version || finalTag !== `v${version}`) throw new Error("candidate final tag disagrees with release URL version");
	if (!integrity.startsWith("sha512-")) throw new Error("candidate integrity must use sha512");
	if (JSON.parse(readFileSync("package.json", "utf8")).dependencies["schema-in-the-mist"] !== releaseUrl) throw new Error("candidate release URL disagrees with package.json");
	const lock = readFileSync("pnpm-lock.yaml", "utf8"); const line = lock.split("\n").find((value) => value.includes("resolution: {") && value.includes(releaseUrl));
	if (!line || !line.includes(`integrity: ${integrity}`)) throw new Error("candidate integrity disagrees with pnpm-lock.yaml");
	if (JSON.parse(readFileSync("node_modules/schema-in-the-mist/package.json", "utf8")).version !== version) throw new Error("installed schema-in-the-mist version disagrees with candidate release URL");
	for (const script of ["tools/assert-mist-contract.mjs", "tools/assert-mist-font-packs.mjs", "tools/assert-source-installer.mjs"]) run(script);
	return { version, releaseUrl, integrity, finalTag, proofs: ["contract", "pack-assets", "source-installer"] };
}
