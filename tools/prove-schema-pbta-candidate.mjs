import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

function required(name) {
	const value = process.env[name];
	if (!value) throw new Error(`missing ${name}`);
	return value;
}

function run(script) {
	const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
	if (result.status !== 0) throw new Error(`${script} failed: ${result.stderr || result.stdout}`.trim());
}

try {
	const archive = required("SCHEMA_PBTA_CANDIDATE_ARCHIVE");
	const integrity = required("SCHEMA_PBTA_CANDIDATE_SRI");
	const ref = required("SCHEMA_PBTA_CANDIDATE_REF");
	if (!archive.startsWith("https://github.com/RebelliousSmile/schema-pbta/releases/download/") || !archive.endsWith(".tgz")) throw new Error("candidate archive is not a stable schema-pbta release asset");
	if (!integrity.startsWith("sha512-")) throw new Error("candidate SRI must use sha512");
	const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
	if (packageJson.dependencies["schema-pbta"] !== archive) throw new Error("candidate archive disagrees with package.json");
	const lockfile = readFileSync("pnpm-lock.yaml", "utf8");
	const resolution = lockfile.split("\n").find((line) => line.includes("resolution: {") && line.includes(archive));
	if (!resolution) throw new Error("candidate archive is absent from pnpm-lock.yaml");
	if (!resolution.includes(`integrity: ${integrity}`)) throw new Error("candidate SRI disagrees with pnpm-lock.yaml");
	const version = archive.slice(archive.lastIndexOf("-") + 1, -4);
	if (ref !== `v${version}`) throw new Error("candidate ref disagrees with the archive version");
	const installed = JSON.parse(readFileSync("node_modules/schema-pbta/package.json", "utf8"));
	if (installed.version !== version) throw new Error("installed schema-pbta version disagrees with candidate archive");
	for (const script of ["tools/assert-pbta-contract.mjs", "tools/assert-pbta-pack-coverage.mjs", "tools/assert-pbta-specialized-projection.mjs", "tools/assert-pbta-theme.mjs", "tools/assert-source-installer.mjs"]) run(script);
	console.log(JSON.stringify({ ok: true, schemaPbta: { version, archive, integrity, ref }, proofs: ["contract", "pack-coverage", "specialized-projection", "theme", "source-installer"] }));
} catch (error) {
	console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
	process.exitCode = 1;
}
