/* global console, process */
import { assertReleaseTrain } from "./release-train-schema-pbta-assert.mjs";
import { resolveManifestPath } from "./release-train-protocol.mjs";

const arguments_ = process.argv.slice(2).filter((value) => value !== "--");
if (arguments_.length !== 1) throw new Error("release-train assertion requires exactly one manifest path");

const manifestPath = resolveManifestPath(arguments_[0]);
const { evidencePath } = await assertReleaseTrain(manifestPath);
console.log(JSON.stringify({ status: "passed", evidencePath }));
