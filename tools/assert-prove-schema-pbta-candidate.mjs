import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { proveSchemaPbtaCandidate } from "./prove-schema-pbta-candidate.mjs";

const archive = JSON.parse(readFileSync("package.json", "utf8")).dependencies["schema-pbta"];
const resolution = readFileSync("pnpm-lock.yaml", "utf8").split("\n").find((line) => line.includes("resolution: {") && line.includes(archive));
const integrity = /integrity: ([^,}]+)/.exec(resolution)?.[1];
const version = archive.slice(archive.lastIndexOf("-") + 1, -4);
assert.deepEqual(proveSchemaPbtaCandidate({ releaseUrl: archive, integrity, finalTag: `v${version}` }).version, version);
assert.throws(() => proveSchemaPbtaCandidate({ releaseUrl: archive, integrity, finalTag: "main" }), /candidate final tag disagrees/);
console.log("schema-pbta candidate proof: green");
