import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROVIDER = "RebelliousSmile/schema-adrenaline";
const RELEASE_PREFIX = `https://github.com/${PROVIDER}/releases/download/`;

function run(script, environment = process.env) {
	const result = spawnSync(process.execPath, [script], { encoding: "utf8", env: environment });
	if (result.status !== 0) throw new Error(`${script} failed: ${result.stderr || result.stdout}`.trim());
}

function git(sourceRoot, arguments_) {
	const result = spawnSync("git", ["-C", sourceRoot, ...arguments_], { encoding: "utf8" });
	if (result.status !== 0) throw new Error(`schema-adrenaline source git ${arguments_.join(" ")} failed: ${result.stderr.trim()}`);
	return result.stdout.trim();
}

function canonicalSource(remote) {
	return remote === `https://github.com/${PROVIDER}` || remote === `https://github.com/${PROVIDER}.git` || remote === `git@github.com:${PROVIDER}.git`;
}

export function proveSchemaAdrenalineCandidate({ releaseUrl, integrity, finalTag, stagingTag, providerCommit, sourceRoot = process.env.SCHEMA_ADRENALINE_ROOT }) {
	if (!releaseUrl.startsWith(RELEASE_PREFIX) || !releaseUrl.endsWith(".tgz")) throw new Error("candidate archive is not a stable schema-adrenaline release asset");
	if (!integrity.startsWith("sha512-")) throw new Error("candidate SRI must use sha512");
	const version = /schema-adrenaline-(\d+\.\d+\.\d+)\.tgz$/.exec(releaseUrl)?.[1];
	const stagingVersion = /^v(\d+\.\d+\.\d+)-rc\.\d+$/.exec(stagingTag)?.[1];
	if (!version || finalTag !== `v${version}` || stagingVersion !== version) throw new Error("candidate tags disagree with the archive version");
	const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
	if (packageJson.dependencies["schema-adrenaline"] !== releaseUrl) throw new Error("candidate archive disagrees with package.json");
	const lockfile = readFileSync("pnpm-lock.yaml", "utf8");
	const resolution = lockfile.split("\n").find((line) => line.includes("resolution: {") && line.includes(releaseUrl));
	if (!resolution || !resolution.includes(`integrity: ${integrity}`)) throw new Error("candidate SRI disagrees with pnpm-lock.yaml");
	const installed = JSON.parse(readFileSync("node_modules/schema-adrenaline/package.json", "utf8"));
	if (installed.version !== version) throw new Error("installed schema-adrenaline version disagrees with candidate archive");
	if (!sourceRoot) throw new Error("SCHEMA_ADRENALINE_ROOT must identify the candidate source checkout");
	const resolvedSourceRoot = resolve(sourceRoot);
	if (!existsSync(resolvedSourceRoot)) throw new Error("SCHEMA_ADRENALINE_ROOT does not exist");
	if (!canonicalSource(git(resolvedSourceRoot, ["remote", "get-url", "origin"]))) throw new Error("SCHEMA_ADRENALINE_ROOT origin is not the canonical provider");
	if (git(resolvedSourceRoot, ["rev-parse", `${stagingTag}^{commit}`]) !== providerCommit) throw new Error("candidate provider commit disagrees with source tag");
	if (git(resolvedSourceRoot, ["rev-parse", "HEAD"]) !== providerCommit) throw new Error("SCHEMA_ADRENALINE_ROOT HEAD disagrees with candidate provider commit");
	for (const script of ["tools/assert-adrenaline-documents.mjs", "tools/assert-adrenaline-contract.mjs", "tools/assert-adrenaline-source.mjs", "tools/assert-contextual-pack-blocks.mjs"]) run(script, { ...process.env, SCHEMA_ADRENALINE_ROOT: resolvedSourceRoot });
	return { version, releaseUrl, integrity, finalTag, stagingTag, providerCommit, proofs: ["documents", "contract", "source-catalog", "capability-gating"] };
}
