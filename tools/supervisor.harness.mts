/**
 * `pnpm assert:supervisor`: the supervisor's behaviour, proved without a
 * network on a throwaway copy of the five repositories.
 *
 * Each scenario builds its own world (`tools/fixtures/supervisor/world.mts`),
 * runs `tools/supervise.mjs` as a child process against it, and asserts on
 * what it printed, what it wrote, and which git and gh calls it made.
 */
import assert from "assert/strict";
import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
import Ajv from "ajv";
import { createWorld, git, HANDBOOK, sh, TOPOLOGY, World } from "./fixtures/supervisor/world.mts";

const statusSchema = JSON.parse(readFileSync(resolve(HANDBOOK, "supervisor/status.schema.json"), "utf8"));
const validateStatus = new Ajv({ allErrors: true }).compile(statusSchema);

type Scenario = { name: string; run: (world: World) => void };
const scenarios: Scenario[] = [];

function scenario(name: string, run: (world: World) => void): void {
	scenarios.push({ name, run });
}

function ok(result: { status: number; stdout: string; stderr: string }, what: string): string {
	assert.equal(result.status, 0, `${what} exited ${result.status}\n${result.stdout}\n${result.stderr}`);
	return result.stdout;
}

// Phase 1: topology and state of the five repositories.

scenario("status lists every repository and leaves each one untouched", (world) => {
	const before = world.snapshot();
	const text = ok(world.supervise(["status"]), "status");
	for (const id of ["obsidian-handbook", "lantern", "schema-pbta", "schema-adrenaline", "schema-in-the-mist"]) {
		assert.match(text, new RegExp(`^${id} \\[`, "m"), `status names ${id}`);
	}
	assert.match(text, /branch main @ [0-9a-f]{10}, clean, ahead 0, behind 0/);
	assert.match(text, /No gaps/);
	assert.deepEqual(world.snapshot(), before, "status changed a HEAD or a working tree");
});

scenario("status --json matches status.schema.json with a pin per consumer and provider", (world) => {
	const status = JSON.parse(ok(world.supervise(["status", "--json"]), "status --json"));
	assert.ok(validateStatus(status), JSON.stringify(validateStatus.errors));
	assert.equal(status.pins.length, 6);
	const lantern = status.pins.find((pin: any) => pin.consumer === "lantern" && pin.provider === "schema-pbta");
	assert.deepEqual(lantern.lockfiles.map((lock: any) => lock.file), ["pnpm-lock.yaml", "package-lock.json"]);
	assert.equal(lantern.lockfiles[1].integrity, world.archive("schema-pbta", "v1.0.0").integrity);
	assert.equal(status.providers.find((provider: any) => provider.id === "schema-pbta").latestRc.tag, "v1.0.1-rc.1");
});

scenario("a branch behind origin/main is named and --strict fails", (world) => {
	for (let index = 0; index < 24; index += 1) world.land("obsidian-handbook", { [`notes/${index}.md`]: `${index}\n` }, `landed ${index}`);
	sh(world.dir("obsidian-handbook"), "git", ["switch", "--quiet", "-c", "feat/old", "HEAD~24"]);
	const text = ok(world.supervise(["status"]), "status");
	assert.match(text, /obsidian-handbook: feat\/old is 24 commit\(s\) behind origin\/main/);
	const strict = world.supervise(["status", "--strict"]);
	assert.notEqual(strict.status, 0, "--strict must fail on a gap");
	const status = JSON.parse(world.supervise(["status", "--json"]).stdout);
	assert.ok(validateStatus(status), JSON.stringify(validateStatus.errors));
	assert.equal(status.repos.find((repo: any) => repo.id === "obsidian-handbook").behind, 24);
});

scenario("a release candidate pin is reported with its URL and lockfile SRI, and divergence names both URLs", (world) => {
	const rc = world.archive("schema-pbta", "v1.0.1-rc.1");
	const handbook = JSON.parse(readFileSync(resolve(world.dir("obsidian-handbook"), "package.json"), "utf8"));
	const final = handbook.dependencies["schema-pbta"];
	const lock = readFileSync(resolve(world.dir("obsidian-handbook"), "pnpm-lock.yaml"), "utf8")
		.split(final).join(rc.url)
		.replace(world.archive("schema-pbta", "v1.0.0").integrity, rc.integrity);
	handbook.dependencies["schema-pbta"] = rc.url;
	world.write("obsidian-handbook", { "package.json": JSON.stringify(handbook), "pnpm-lock.yaml": lock });
	const text = ok(world.supervise(["status"]), "status");
	assert.ok(text.includes(`obsidian-handbook: schema-pbta is pinned to release candidate v1.0.1-rc.1: ${rc.url} (${rc.integrity})`), text);
	assert.ok(text.includes(`obsidian-handbook: ${rc.url}`) && text.includes(`lantern: ${final}`), text);
	assert.notEqual(world.supervise(["status", "--strict"]).status, 0);
});

scenario("an edge to an undeclared repository is refused before any git command", (world) => {
	const result = world.supervise(["status"], { topology: resolve(HANDBOOK, "tools/fixtures/supervisor/topology-unknown-edge.json") });
	assert.equal(result.status, 2, result.stderr);
	assert.match(result.stderr, /edge schema-pbta -> ghost points to an undeclared repository/);
	let calls = "";
	try {
		calls = readFileSync(world.gitLog, "utf8");
	} catch {
		calls = "";
	}
	assert.equal(calls, "", "git ran before the topology was accepted");
	assert.equal(world.readState().calls.length, 0, "gh ran before the topology was accepted");
});

scenario("the shipped topology lists exactly the five repositories", () => {
	const topology = JSON.parse(readFileSync(resolve(HANDBOOK, "supervisor/topology.json"), "utf8"));
	assert.deepEqual(
		topology.repos.map((repo: any) => repo.id).sort(),
		["lantern", "obsidian-handbook", "schema-adrenaline", "schema-in-the-mist", "schema-pbta"],
	);
});

// Phase 2: train record, issues and next step.

const REPOSITORY: Record<string, string> = Object.fromEntries(TOPOLOGY.repos.map((repo: any) => [repo.id, repo.repository]));
const TRAIN_ID = "couleur-otherscape";

function trainPath(world: World, id = TRAIN_ID): string {
	return resolve(world.dir("obsidian-handbook"), "supervisor/trains", `${id}.json`);
}

function readRecord(world: World, id = TRAIN_ID): any {
	return JSON.parse(readFileSync(trainPath(world, id), "utf8"));
}

function seedIssues(world: World): void {
	world.updateState((state) => {
		state.issues[REPOSITORY["schema-in-the-mist"]] = {
			31: { number: 31, title: "Otherscape colour tokens", state: "OPEN" },
			32: { number: 32, title: "Another Mist change", state: "OPEN" },
		};
		state.issues[REPOSITORY["obsidian-handbook"]] = { 12: { number: 12, title: "Render the new colours", state: "OPEN" } };
		state.issues[REPOSITORY.lantern] = { 40: { number: 40, title: "Offer the new colours", state: "OPEN" } };
	});
}

function creates(world: World, repository?: string): any[] {
	return world.readState().calls.filter((call: any) => call.args[0] === "issue" && call.args[1] === "create"
		&& (!repository || call.args.includes(repository)));
}

function openTrain(world: World, id = TRAIN_ID, title = "Otherscape colours"): void {
	ok(world.supervise(["open", id, "--title", title]), `open ${id}`);
}

function next(world: World): Record<string, any> {
	const evaluation = JSON.parse(ok(world.supervise(["next", "--json"]), "next --json"));
	return Object.fromEntries(evaluation.items.map((item: any) => [item.repo, item]));
}

scenario("open writes a stable record and a coordination issue with the supervisor block", (world) => {
	openTrain(world);
	const text = readFileSync(trainPath(world), "utf8");
	const record = JSON.parse(text);
	assert.equal(`${JSON.stringify(record, null, "\t")}\n`, text, "the record is not byte-stable");
	assert.deepEqual(record.coordinationIssue, { repo: "obsidian-handbook", number: 1, url: `https://github.com/${REPOSITORY["obsidian-handbook"]}/issues/1` });
	assert.equal(record.approval, null);
	const created = creates(world);
	assert.equal(created.length, 1);
	assert.ok(created[0].args.includes(REPOSITORY["obsidian-handbook"]));
	const issue = world.readState().issues[REPOSITORY["obsidian-handbook"]][1];
	assert.equal(issue.title, `Train ${TRAIN_ID}: Otherscape colours`);
	assert.match(issue.body, /<!-- supervisor:begin -->[\s\S]*<!-- supervisor:end -->/);
	const again = world.supervise(["open", TRAIN_ID, "--title", "twice"]);
	assert.equal(again.status, 2);
	assert.match(again.stderr, /already exists/);
	assert.equal(creates(world).length, 1, "a refused open created an issue");
});

scenario("link reuses issues, next follows the topology, and a merged provider unblocks its consumers", (world) => {
	seedIssues(world);
	openTrain(world);
	ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
	ok(world.supervise(["link", "obsidian-handbook#12"]), "link handbook");
	ok(world.supervise(["link", "lantern#40"]), "link lantern");
	assert.equal(creates(world).length, 1, "link created an issue");
	const record = readRecord(world);
	const items = Object.fromEntries(record.items.map((item: any) => [item.repo, item]));
	assert.deepEqual(items["schema-in-the-mist"].dependsOn, []);
	assert.deepEqual(items["obsidian-handbook"].dependsOn, ["schema-in-the-mist"]);
	assert.deepEqual(items.lantern.dependsOn, ["schema-in-the-mist"]);
	assert.equal(items["schema-in-the-mist"].baseSha, git(world.dir("schema-in-the-mist"), "rev-parse", "origin/main"));
	assert.equal(items["obsidian-handbook"].title, "Render the new colours");

	let state = next(world);
	assert.equal(state["schema-in-the-mist"].state, "ready");
	assert.equal(state["obsidian-handbook"].state, "blocked");
	assert.deepEqual(state.lantern.blockedBy.map((dependency: any) => dependency.label), ["schema-in-the-mist#31"]);
	assert.match(ok(world.supervise(["next"]), "next"), /Blocked:\n.*obsidian-handbook#12.*blocked by schema-in-the-mist#31 \(open\)/);

	const status = JSON.parse(ok(world.supervise(["status", "--json"]), "status --json"));
	assert.ok(validateStatus(status), JSON.stringify(validateStatus.errors));
	assert.equal(status.train.id, TRAIN_ID);
	assert.equal(status.train.items.length, 3);

	// Mist merges and closes #31; the local Mist checkout has not fetched nor pulled.
	const mist = world.dir("schema-in-the-mist");
	const before = git(mist, "rev-parse", "HEAD");
	const merged = world.land("schema-in-the-mist", { "src/colours.ts": "export const colours = [];\n" }, "Add colours (fixes #31)");
	git(mist, "reset", "--quiet", "--hard", before);
	git(mist, "update-ref", "refs/remotes/origin/main", before);
	world.updateState((state) => {
		state.issues[REPOSITORY["schema-in-the-mist"]][31].state = "CLOSED";
		state.events[`repos/${REPOSITORY["schema-in-the-mist"]}/issues/31/events`] = [{ event: "closed", commit_id: merged }];
	});
	const recordBefore = readFileSync(trainPath(world), "utf8");
	state = next(world);
	assert.equal(state["schema-in-the-mist"].state, "done");
	assert.equal(state["schema-in-the-mist"].commit, merged);
	assert.equal(state["obsidian-handbook"].state, "ready");
	assert.equal(state.lantern.state, "ready");
	assert.equal(git(mist, "rev-parse", "HEAD"), before, "next moved the Mist checkout");
	assert.equal(readFileSync(trainPath(world), "utf8"), recordBefore, "next changed the record");

	// Handbook closes through a merged pull request; Lantern is closed by hand, without a commit.
	const handbookMerge = world.land("obsidian-handbook", { "src/colours.ts": "export {};\n" }, "Merge pull request #5");
	world.updateState((state) => {
		state.prs[REPOSITORY["obsidian-handbook"]] = { 5: { mergeCommit: handbookMerge } };
		Object.assign(state.issues[REPOSITORY["obsidian-handbook"]][12], { state: "CLOSED", closedByPullRequests: [5] });
		state.issues[REPOSITORY.lantern][40].state = "CLOSED";
	});
	state = next(world);
	assert.equal(state["obsidian-handbook"].state, "done");
	assert.equal(state["obsidian-handbook"].via, "pull request #5");
	assert.equal(state.lantern.state, "closed-unproven");
});

scenario("sync rewrites only the supervisor block of the coordination issue", (world) => {
	seedIssues(world);
	openTrain(world);
	ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
	const coordination = readRecord(world).coordinationIssue.number;
	world.updateState((state) => {
		const issue = state.issues[REPOSITORY["obsidian-handbook"]][coordination];
		issue.body = `Written by hand above.\n\n${issue.body}\nWritten by hand below.\n`;
	});
	ok(world.supervise(["sync"]), "sync");
	const body = world.readState().issues[REPOSITORY["obsidian-handbook"]][coordination].body;
	assert.match(body, /^Written by hand above\./);
	assert.match(body, /Written by hand below\.\n$/);
	assert.match(body, /\[schema-in-the-mist#31\]\(https:\/\/github\.com\/RebelliousSmile\/schema-in-the-mist\/issues\/31\) Otherscape colour tokens \| ready \|/);
	assert.equal(body.split("<!-- supervisor:begin -->").length, 2, "the block was duplicated");
	const edits = () => world.readState().calls.filter((call: any) => call.args[0] === "issue" && call.args[1] === "edit").length;
	const count = edits();
	assert.match(ok(world.supervise(["sync"]), "sync again"), /already up to date/);
	assert.equal(edits(), count, "an unchanged block was written again");
});

scenario("a repository engaged by another open train is refused, from the checkout or from origin/main", (world) => {
	seedIssues(world);
	openTrain(world);
	ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
	openTrain(world, "autre-train", "Another change");
	const calls = world.readState().calls.length;
	let refused = world.supervise(["link", "schema-in-the-mist#32", "--train", "autre-train"]);
	assert.equal(refused.status, 2, refused.stderr);
	assert.match(refused.stderr, new RegExp(`already engaged by the open train "${TRAIN_ID}"`));
	assert.equal(world.readState().calls.length, calls, "a refused link called gh");

	// The first train is only on origin/main of Handbook, not in the checkout.
	const handbook = world.dir("obsidian-handbook");
	git(handbook, "add", "supervisor/trains");
	git(handbook, "commit", "--quiet", "-m", "record trains");
	git(handbook, "push", "--quiet", "origin", "HEAD:main");
	rmSync(trainPath(world));
	refused = world.supervise(["link", "schema-in-the-mist#32", "--train", "autre-train"]);
	assert.equal(refused.status, 2, refused.stderr);
	assert.match(refused.stderr, new RegExp(`already engaged by the open train "${TRAIN_ID}"`));
});

scenario("a record with a dependency cycle or without coordination issue is refused by name", (world) => {
	seedIssues(world);
	openTrain(world);
	ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
	ok(world.supervise(["link", "obsidian-handbook#12"]), "link handbook");
	const record = readRecord(world);
	record.items.find((item: any) => item.repo === "schema-in-the-mist").dependsOn = ["obsidian-handbook"];
	writeFileSync(trainPath(world), JSON.stringify(record, null, "\t"));
	let result = world.supervise(["next"]);
	assert.equal(result.status, 2);
	assert.match(result.stderr, /dependency cycle (schema-in-the-mist -> obsidian-handbook -> schema-in-the-mist|obsidian-handbook -> schema-in-the-mist -> obsidian-handbook)/);
	delete record.coordinationIssue;
	writeFileSync(trainPath(world), JSON.stringify(record, null, "\t"));
	result = world.supervise(["next"]);
	assert.equal(result.status, 2);
	assert.match(result.stderr, /coordinationIssue/);
});

scenario("link --create asks first: nothing is created without a terminal or --yes", (world) => {
	openTrain(world);
	const refused = world.supervise(["link", "lantern", "--create", "--title", "Offer the new colours"]);
	assert.equal(refused.status, 2, refused.stderr);
	assert.match(refused.stderr, /pass --yes/);
	assert.equal(creates(world, REPOSITORY.lantern).length, 0, "an issue was created without confirmation");
	assert.ok(!readRecord(world).items.length, "a refused link wrote an item");
	ok(world.supervise(["link", "lantern", "--create", "--title", "Offer the new colours", "--yes"]), "link --create --yes");
	assert.equal(creates(world, REPOSITORY.lantern).length, 1);
	const item = readRecord(world).items[0];
	assert.equal(item.issue, 1);
	assert.equal(item.title, "Offer the new colours");
	assert.ok(existsSync(trainPath(world)));
});

function main(): void {
	const handbookBefore = sh(HANDBOOK, "git", ["status", "--porcelain"]).stdout;
	const only = process.env.SUPERVISOR_SCENARIO;
	let failed = 0;
	for (const { name, run } of scenarios) {
		if (only && !name.includes(only)) continue;
		const world = createWorld();
		try {
			run(world);
			console.log(`ok   ${name}`);
		} catch (error) {
			failed += 1;
			console.error(`FAIL ${name}\n${(error as Error).stack ?? error}`);
		} finally {
			world.dispose();
		}
	}
	assert.equal(sh(HANDBOOK, "git", ["status", "--porcelain"]).stdout, handbookBefore, "the harness left files in the Handbook checkout");
	if (failed > 0) {
		console.error(`\n${failed} supervisor scenario(s) failed.`);
		process.exit(1);
	}
	console.log("\nSupervisor scenarios passed.");
}

main();
