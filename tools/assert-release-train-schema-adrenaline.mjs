import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const releaseUrl = JSON.parse(readFileSync("package.json", "utf8")).dependencies["schema-adrenaline"];
const finalUrl = "https://github.com/RebelliousSmile/schema-adrenaline/releases/download/v2.5.0/candidate.tgz";
const sha256 = "62033e75384f17ee21e4e5e76d231b84c25b3fdcb0d5de74ecdbc89c94be95cc";
const integrity = "sha512-cb/ZUmHy5LYaMQPmit7tRQIybBQWW8fFN4fgeaHZYoSZHKFuQJgIFVc3p/BhgRVhT00dT7r9DZCk7gmPMTpkjQ==";
const lock = readFileSync("pnpm-lock.yaml", "utf8");
const resolution = lock.split("\n").find((line) => line.includes("resolution: {") && line.includes(`tarball: ${releaseUrl}`));

assert.equal(releaseUrl, finalUrl);
assert.ok(resolution?.includes(`integrity: ${integrity}`));
assert.equal(JSON.parse(readFileSync("node_modules/schema-adrenaline/package.json", "utf8")).version, "2.5.0");
const response = await fetch(finalUrl);
assert.equal(response.ok, true, `could not download final Adrenaline archive: ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
assert.equal(createHash("sha256").update(bytes).digest("hex"), sha256);
assert.equal(`sha512-${createHash("sha512").update(bytes).digest("base64")}`, integrity);

// The immutable final release kept the provider's published asset name.
// Its candidate protocol-1 proof remains historical; a final pin cannot
// honestly be rerun as a staged candidate adoption.
console.log("release-train schema-adrenaline final pin assertion passed");
