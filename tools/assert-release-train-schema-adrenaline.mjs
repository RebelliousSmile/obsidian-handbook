import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { finalPin } from "./guardsByRole.mjs";

// The pin moves with every train: the guard reads it where it is declared, and holds none of its figures.
const pin = finalPin(
	"schema-adrenaline",
	JSON.parse(readFileSync("package.json", "utf8")),
	readFileSync("pnpm-lock.yaml", "utf8"),
	JSON.parse(readFileSync("node_modules/schema-adrenaline/package.json", "utf8")).version,
);
const response = await fetch(pin.releaseUrl);
assert.equal(response.ok, true, `could not download final Adrenaline archive: ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
assert.equal(`sha512-${createHash("sha512").update(bytes).digest("base64")}`, pin.integrity, `the bytes published at ${pin.releaseUrl} are not the ones pnpm-lock.yaml records`);

// The immutable final release kept the provider's published asset name.
// Its candidate protocol-1 proof remains historical; a final pin cannot
// honestly be rerun as a staged candidate adoption.
console.log(`release-train schema-adrenaline final pin assertion passed (${pin.version})`);
