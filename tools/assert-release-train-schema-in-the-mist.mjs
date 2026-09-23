import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { proveSchemaInTheMistCandidate } from "./prove-schema-in-the-mist-candidate.mjs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const releaseUrl = packageJson.dependencies["schema-in-the-mist"];
const lock = readFileSync("pnpm-lock.yaml", "utf8");
const resolution = lock.split("\n").find((line) => line.includes("resolution: {") && line.includes(releaseUrl));
const integrity = /integrity: ([^,}]+)/.exec(resolution)?.[1];
const version = /schema-in-the-mist-(\d+\.\d+\.\d+)\.tgz$/.exec(releaseUrl)?.[1];

assert.equal(proveSchemaInTheMistCandidate({ releaseUrl, integrity, finalTag: `v${version}` }).version, version);
assert.throws(() => proveSchemaInTheMistCandidate({ releaseUrl, integrity: "sha512-forged", finalTag: `v${version}` }));
console.log("release-train Mist regression assertion: green");
