/* global console, process */
import { existsSync, rmSync } from "node:fs";
import { assertReleaseTrain } from "./release-train-schema-pbta-assert.mjs";
import { assertSchemaAdrenalineReleaseTrain } from "./release-train-schema-adrenaline-assert.mjs";
import { assertSchemaInTheMistReleaseTrain } from "./release-train-schema-in-the-mist-assert.mjs";
import { readProtocolManifest, resolveManifestPath } from "./release-train-protocol.mjs";

const arguments_ = process.argv.slice(2).filter((value) => value !== "--");
if (arguments_.length !== 1) throw new Error("release-train assertion requires exactly one manifest path");

const manifestPath = resolveManifestPath(arguments_[0]);
const evidencePath = `${manifestPath}.evidence.json`;
if (existsSync(evidencePath)) rmSync(evidencePath);
const manifest = readProtocolManifest(manifestPath);
const provider = manifest.protocol === 2 ? manifest.artifact.provider : manifest.candidate.provider;
const assertions = {
	"schema-pbta": assertReleaseTrain,
	"schema-adrenaline": assertSchemaAdrenalineReleaseTrain,
	"schema-in-the-mist": assertSchemaInTheMistReleaseTrain,
};
const assertion = assertions[provider];
if (!assertion) throw new Error("release-train candidate provider is not supported");
const result = await assertion(manifestPath);
console.log(JSON.stringify({ status: "passed", evidencePath: result.evidencePath }));
