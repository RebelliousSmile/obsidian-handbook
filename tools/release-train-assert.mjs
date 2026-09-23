/* global console, process */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { assertReleaseTrain } from "./release-train-schema-pbta-assert.mjs";
import { assertSchemaAdrenalineReleaseTrain } from "./release-train-schema-adrenaline-assert.mjs";

const arguments_ = process.argv.slice(2).filter((value) => value !== "--");
if (arguments_.length !== 1) {
  throw new Error("release-train assertion requires exactly one manifest path");
}
const manifest = JSON.parse(readFileSync(arguments_[0], "utf8"));
if (manifest?.provider?.repository === "RebelliousSmile/schema-adrenaline") {
  console.log(JSON.stringify(await assertSchemaAdrenalineReleaseTrain(arguments_[0])));
} else {
  const build = spawnSync("npm", ["run", "build"], { stdio: "inherit", shell: process.platform === "win32" });
  if (build.status !== 0) throw new Error("release-train Handbook build failed");
  const { evidencePath } = await assertReleaseTrain(arguments_[0]);
  console.log(JSON.stringify({ status: "passed", evidencePath }));
}
