import assert from "node:assert/strict";
import { PackIntegrationModal } from "../src/settings/packIntegrationModal";
import type { PackIntegrationReport } from "../src/features/packs/integration";

const eventStore = globalThis as { packIntegrationModalEvents?: string[] };
const events = eventStore.packIntegrationModalEvents ?? [];
eventStore.packIntegrationModalEvents = events;
let calls = 0;
const loader = async (): Promise<PackIntegrationReport> => {
	calls += 1;
	if (calls === 1) throw new Error("adapter timed out");
	return { packs: [], installed: 0, ready: 0, attention: 0 };
};

async function main(): Promise<void> {
	const modal = new PackIntegrationModal({} as never, {} as never, loader);
	await (modal as unknown as { refresh(): Promise<void> }).refresh();
	assert.ok(events.some((event) => event.includes("Pack integration check failed")), "a rejected refresh is rendered as a named failure");
	assert.ok(events.includes("Retry"), "a rejected refresh offers retry");

	await (modal as unknown as { refresh(): Promise<void> }).refresh();
	assert.equal(calls, 2, "retry invokes the report loader again");
	assert.ok(events.some((event) => event.includes("No game pack is registered")), "a successful retry replaces the failure state");

	console.log("Pack integration modal passed: failure is visible and retry can recover.");
}

void main();
