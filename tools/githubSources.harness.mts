import assert from "node:assert/strict";
import { resolveGithubSource } from "../src/games/githubSources";

const source = await resolveGithubSource({
	id: "owner--repo",
	repository: "owner/repo",
	reference: { kind: "branch", value: "main" },
});

assert.equal(source.revision, "a".repeat(40));
assert.equal(source.releaseTag, undefined);
assert.equal(await source.readText("handbook.json"), "manifest text");
assert.deepEqual(await source.inspectBinary("image.png"), { contentLength: 3 });
assert.deepEqual(await source.inspectBinary("invalid-length.png"), { invalidContentLength: "not-a-number" });
assert.deepEqual(await source.inspectBinary("head-disabled.png"), {}, "unsupported HEAD retains the post-read compatibility path");
assert.deepEqual(
	new Uint8Array(await source.readBinary("image.png")),
	new Uint8Array([1, 2, 3]),
);
const latest = await resolveGithubSource({
	id: "owner--repo",
	repository: "owner/repo",
	reference: { kind: "latest" },
});
assert.equal(latest.revision, "b".repeat(40));
assert.equal(latest.releaseTag, "v1.3.4");
console.log("GitHub sources use Obsidian requestUrl response properties.");
