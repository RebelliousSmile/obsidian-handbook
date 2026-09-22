import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const archive = JSON.parse(readFileSync("package.json", "utf8")).dependencies["schema-pbta"];
const resolution = readFileSync("pnpm-lock.yaml", "utf8").split("\n").find((line) => line.includes("resolution: {") && line.includes(archive));
const integrity = /integrity: ([^,}]+)/.exec(resolution)?.[1];
const version = archive.slice(archive.lastIndexOf("-") + 1, -4);
const env = { ...process.env, SCHEMA_PBTA_CANDIDATE_ARCHIVE: archive, SCHEMA_PBTA_CANDIDATE_SRI: integrity, SCHEMA_PBTA_CANDIDATE_REF: `v${version}` };
const success = spawnSync(process.execPath, ["tools/prove-schema-pbta-candidate.mjs"], { encoding: "utf8", env });
assert.equal(success.status, 0, success.stderr);
assert.deepEqual(JSON.parse(success.stdout).schemaPbta, { version, archive, integrity, ref: `v${version}` });
const rejected = spawnSync(process.execPath, ["tools/prove-schema-pbta-candidate.mjs"], { encoding: "utf8", env: { ...env, SCHEMA_PBTA_CANDIDATE_REF: "main" } });
assert.notEqual(rejected.status, 0);
assert.match(rejected.stderr, /candidate ref disagrees/);
console.log("schema-pbta candidate proof: green");
