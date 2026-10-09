/**
 * Stopping a dev server: the whole tree goes, a pid reused by another program
 * is left alone, and an interrupted preview's servers are reaped by the next.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearServers, commandLine, isAlive, reapServers, recordServers, stopTree } from "./supervisor/processTree.mjs";

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
async function until(check: () => boolean, label: string) {
	for (let attempt = 0; attempt < 100; attempt += 1) {
		if (check()) return;
		await sleep(100);
	}
	assert.fail(label);
}

const work = mkdtempSync(join(tmpdir(), "process-tree-"));
// A marker the command line of every process below carries, as the server file does for a real preview.
const MARKER = "previewServerMarker";
const grandchild = `setInterval(() => {}, 1000);`;
const child = `const { spawn } = require("node:child_process"); const g = spawn(process.execPath, ["-e", ${JSON.stringify(grandchild)}, "${MARKER}"], { stdio: "ignore" }); process.stdout.write(String(g.pid) + ";"); setInterval(() => {}, 1000);`;
const spawned: number[] = [];
try {
	// Setup: a server (child) that started another process (grandchild).
	const server = spawn(process.execPath, ["-e", child, MARKER], { stdio: ["ignore", "pipe", "inherit"], detached: process.platform !== "win32" });
	spawned.push(server.pid!);
	const grandPid = await new Promise<number>((done) => server.stdout!.once("data", (data) => done(Number(String(data).replace(/;.*/s, "")))));
	spawned.push(grandPid);
	assert.ok(isAlive(server.pid!) && isAlive(grandPid), "both levels are running");

	// A pid whose command line is not the server's is left alone; one whose command line cannot be read too.
	const registry = join(work, "servers.json");
	recordServers(registry, [server.pid!]);
	assert.deepEqual(reapServers(registry, "someOtherProgram"), [], "a foreign command line is not stopped");
	assert.ok(isAlive(server.pid!), "the foreign-looking pid survived");
	recordServers(registry, [server.pid!]);
	assert.deepEqual(reapServers(registry, MARKER, { read: () => null }), [], "an unreadable command line is not stopped");
	assert.ok(isAlive(server.pid!));
	assert.ok((commandLine(server.pid!) ?? "").includes(MARKER), "the command line of a running server is readable");

	// Edge case - relaunch: the previous preview's server is stopped, tree included.
	recordServers(registry, [server.pid!]);
	assert.deepEqual(reapServers(registry, MARKER), [server.pid]);
	await until(() => !isAlive(server.pid!) && !isAlive(grandPid), "the whole tree is stopped");

	// Happy path: stopTree ends every level; stopping a dead tree is not an error.
	const second = spawn(process.execPath, ["-e", child, MARKER], { stdio: ["ignore", "pipe", "inherit"], detached: process.platform !== "win32" });
	spawned.push(second.pid!);
	const secondGrand = await new Promise<number>((done) => second.stdout!.once("data", (data) => done(Number(String(data).replace(/;.*/s, "")))));
	spawned.push(secondGrand);
	stopTree(second.pid!);
	await until(() => !isAlive(second.pid!) && !isAlive(secondGrand), "stopTree ends the grandchild too");
	stopTree(second.pid!);

	// A missing or unreadable registry reaps nothing.
	assert.deepEqual(reapServers(join(work, "none.json"), MARKER), []);
	writeFileSync(registry, "not json");
	assert.deepEqual(reapServers(registry, MARKER), []);
	clearServers(registry);
} finally {
	for (const pid of spawned) stopTree(pid);
	rmSync(work, { recursive: true, force: true });
}
console.log("process tree: ok");
