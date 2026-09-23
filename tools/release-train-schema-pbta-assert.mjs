import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { proveSchemaPbtaCandidate } from "./prove-schema-pbta-candidate.mjs";
import { proveSchemaInTheMistCandidate } from "./prove-schema-in-the-mist-candidate.mjs";

const expected = { role: "handbook", repository: "RebelliousSmile/obsidian-handbook" };
function text(value, name) { if (typeof value !== "string" || !value) throw new Error(`manifest ${name} must be a non-empty string`); return value; }
function git(...args) { const result = spawnSync("git", args, { encoding: "utf8" }); if (result.status !== 0) throw new Error(`could not resolve consumer ref: ${result.stderr.trim()}`); return result.stdout.trim(); }
async function sha256(url) { const response = await fetch(url); if (!response.ok) throw new Error(`candidate release download failed: ${response.status}`); return createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex"); }
export async function assertReleaseTrain(manifestArgument) {
	if (!manifestArgument || isAbsolute(manifestArgument)) throw new Error("release-train manifest must be one relative path");
	const manifestPath = resolve(manifestArgument); const fromRoot = relative(resolve("."), manifestPath);
	if (!fromRoot || fromRoot === ".." || fromRoot.startsWith(`..${sep}`)) throw new Error("release-train manifest must stay inside the Handbook checkout");
	const evidencePath = `${manifestPath}.evidence.json`; if (existsSync(evidencePath)) rmSync(evidencePath);
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8")); const candidate = manifest?.candidate ?? {}; const consumer = manifest?.consumer ?? {};
	const releaseUrl = text(candidate.releaseUrl, "candidate.releaseUrl"); const integrity = text(candidate.integrity, "candidate.integrity"); const finalTag = text(candidate.finalTag, "candidate.finalTag"); const digest = text(candidate.sha256, "candidate.sha256").toLowerCase();
	if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error("manifest candidate.sha256 must be a SHA-256 hex digest");
	if (text(consumer.role, "consumer.role") !== expected.role || text(consumer.repository, "consumer.repository") !== expected.repository) throw new Error("manifest consumer does not identify Handbook");
	const ref = text(consumer.ref, "consumer.ref"); if (git("rev-parse", "HEAD") !== git("rev-parse", "--verify", `${ref}^{commit}`)) throw new Error("manifest consumer.ref does not resolve to checked-out Handbook HEAD");
	if (await sha256(releaseUrl) !== digest) throw new Error("candidate SHA-256 disagrees with release asset");
	const proof = releaseUrl.includes("/schema-pbta/") ? proveSchemaPbtaCandidate({ releaseUrl, integrity, finalTag }) : releaseUrl.includes("/schema-in-the-mist/") ? proveSchemaInTheMistCandidate({ releaseUrl, integrity, finalTag }) : (() => { throw new Error("manifest candidate provider is unsupported"); })();
	const evidence = { status: "passed", artifact: { releaseUrl, sha256: digest, integrity, version: proof.version }, consumer: { role: expected.role, repository: expected.repository, ref } };
	writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
	return { proof, evidencePath };
}
const argument = process.argv.slice(2).filter((value) => value !== "--"); if (argument.length !== 1) { console.error("release-train manifest must be one relative path"); process.exitCode = 1; } else assertReleaseTrain(argument[0]).then(({ evidencePath }) => console.log(JSON.stringify({ status: "passed", evidencePath }))).catch((error) => { console.error(error.message); process.exitCode = 1; });
