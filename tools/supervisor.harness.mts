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
import { createWorld, git, HANDBOOK, sh, SUPERVISE, TOPOLOGY, World } from "./fixtures/supervisor/world.mts";

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

// Phase 3: presentation and approval.

const PASS = ["sh", "-c", "echo validation passed"];

/** The shipped topology with harmless validations, written in the world. */
function testTopology(world: World, validations: Record<string, string[][]> = {}): string {
	const file = resolve(world.tmp, "topology.json");
	const topology = JSON.parse(JSON.stringify(TOPOLOGY));
	for (const repo of topology.repos) repo.validations = validations[repo.id] ?? [PASS];
	writeFileSync(file, JSON.stringify(topology));
	return file;
}

/** A train whose three items (Mist, Handbook, Lantern) are closed by a commit on origin/main. */
function doneTrain(world: World): void {
	seedIssues(world);
	openTrain(world);
	ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
	ok(world.supervise(["link", "obsidian-handbook#12"]), "link handbook");
	ok(world.supervise(["link", "lantern#40"]), "link lantern");
	const closing: Array<[string, number, string]> = [["schema-in-the-mist", 31, "src/colours.ts"], ["obsidian-handbook", 12, "src/colours.ts"], ["lantern", 40, "src/colours.ts"]];
	for (const [repo, issue, path] of closing) {
		const commit = world.land(repo, { [path]: `export const ${repo.replace(/-/g, "")} = [];\n` }, `Colours (fixes #${issue})`);
		world.updateState((state) => {
			state.issues[REPOSITORY[repo]][issue].state = "CLOSED";
			state.events[`repos/${REPOSITORY[repo]}/issues/${issue}/events`] = [{ event: "closed", commit_id: commit }];
		});
	}
}

function quote(argument: string): string {
	return `'${argument.replace(/'/g, "'\\''")}'`;
}

/** `supervise` on a pseudo-terminal (util-linux `script`), `input` typed on it. */
function superviseTty(world: World, args: string[], input: string, topology: string) {
	const [command, ...rest] = args;
	const line = [process.execPath, SUPERVISE, command, "--root", world.root, "--topology", topology, ...rest].map(quote).join(" ");
	return sh(HANDBOOK, "script", ["-qec", line, "/dev/null"], world.env(), input);
}

function presentAndApprove(world: World, topology: string): void {
	ok(world.supervise(["present"], { topology }), "present");
	ok(superviseTty(world, ["approve"], `${TRAIN_ID}\n`, topology), "approve");
}

scenario("present reports each concerned repository with its SHA, commits and validations", (world) => {
	const topology = testTopology(world);
	doneTrain(world);
	const report = ok(world.supervise(["present"], { topology }), "present");
	for (const repo of ["schema-in-the-mist", "obsidian-handbook", "lantern"]) {
		const sha = git(world.dir(repo), "rev-parse", "origin/main");
		assert.ok(report.includes(`## ${repo} (`) && report.includes(sha.slice(0, 10)), `${repo} at ${sha} missing\n${report}`);
	}
	assert.match(report, /\*\*Presentable\.\*\*/);
	assert.match(report, /Colours \(fixes #31\)/);
	assert.match(report, /passed: `sh -c echo validation passed`/);
	assert.match(report, /schema-in-the-mist: release candidate of schema-in-the-mist/);
	assert.match(report, /schema-in-the-mist: final release of schema-in-the-mist, same bytes as the candidate/);
	assert.match(report, /lantern: release/);
	assert.match(report, /Local preview: none exists yet/);
	const record = readRecord(world);
	assert.equal(record.presentation.presentable, true);
	assert.equal(record.approval, null, "present approved");
	assert.ok(!report.includes("schema-pbta ("), "an unconcerned provider was presented");
});

scenario("present refuses an unfinished train and a checkout that is not origin/main", (world) => {
	const topology = testTopology(world);
	seedIssues(world);
	openTrain(world);
	ok(world.supervise(["link", "schema-in-the-mist#31"]), "link mist");
	let result = world.supervise(["present"], { topology });
	assert.equal(result.status, 1, result.stderr);
	assert.match(result.stderr, /not every item is done: schema-in-the-mist#31 \(ready\)/);

	world.updateState((state) => { state.issues[REPOSITORY["schema-in-the-mist"]][31].state = "CLOSED"; });
	const commit = world.land("schema-in-the-mist", { "src/colours.ts": "export {};\n" }, "Colours");
	world.updateState((state) => { state.events[`repos/${REPOSITORY["schema-in-the-mist"]}/issues/31/events`] = [{ event: "closed", commit_id: commit }]; });
	world.write("lantern", { "src/index.ts": "dirty\n" });
	sh(world.dir("obsidian-handbook"), "git", ["switch", "--quiet", "-c", "feat/elsewhere"]);
	world.commit("obsidian-handbook", { "src/other.ts": "export {};\n" }, "not landed");
	result = world.supervise(["present"], { topology });
	assert.equal(result.status, 1, result.stderr);
	assert.match(result.stderr, /lantern: uncommitted changes/);
	assert.match(result.stderr, /obsidian-handbook: HEAD [0-9a-f]{10} is not origin\/main .*switch main && git -C .* pull --ff-only/);
});

scenario("approve records nothing without a terminal, and records the typed id bound to the SHAs", (world) => {
	const topology = testTopology(world);
	doneTrain(world);
	ok(world.supervise(["present"], { topology }), "present");
	const refused = world.supervise(["approve"], { topology, input: `${TRAIN_ID}\n` });
	assert.equal(refused.status, 1, refused.stderr);
	assert.match(refused.stderr, /interactive terminal/);
	assert.equal(readRecord(world).approval, null, "an approval was written without a terminal");

	const wrong = superviseTty(world, ["approve"], "yes\n", topology);
	assert.equal(wrong.status, 1, wrong.stdout);
	assert.equal(readRecord(world).approval, null, "a wrong id approved the train");

	const approved = ok(superviseTty(world, ["approve"], `${TRAIN_ID}\n`, topology), "approve");
	const record = readRecord(world);
	assert.ok(approved.includes(record.presentation.digest), approved);
	assert.equal(record.approval.digest, record.presentation.digest);
	assert.deepEqual(record.approval.repos.map((entry: any) => entry.repo).sort(), ["lantern", "obsidian-handbook", "schema-in-the-mist"]);
	assert.equal(record.approval.repos.find((entry: any) => entry.repo === "lantern").sha, git(world.dir("lantern"), "rev-parse", "origin/main"));
	assert.ok(record.approval.publications.includes("schema-in-the-mist: release candidate of schema-in-the-mist"));
	assert.ok(record.approval.approvedAt);
	ok(world.supervise(["approve", "--verify"], { topology }), "approve --verify");
});

scenario("approve refuses a presentation the repositories moved away from", (world) => {
	const topology = testTopology(world);
	doneTrain(world);
	ok(world.supervise(["present"], { topology }), "present");
	world.land("lantern", { "src/late.ts": "export {};\n" }, "late change");
	const result = superviseTty(world, ["approve"], `${TRAIN_ID}\n`, topology);
	assert.equal(result.status, 1, result.stdout);
	assert.match(result.stdout, /lantern: origin\/main is [0-9a-f]{10}, the presentation showed/);
	assert.equal(readRecord(world).approval, null);
});

scenario("an adoption commit of the observed candidate keeps the approval; any other change voids it", (world) => {
	const topology = testTopology(world);
	doneTrain(world);
	presentAndApprove(world, topology);
	const candidate = world.archive("schema-in-the-mist", "v1.0.1-rc.1");
	const final = world.archive("schema-in-the-mist", "v1.0.0");
	const record = readRecord(world);
	record.publication = { "schema-in-the-mist": { candidate: { tag: candidate.tag, url: candidate.url, sha256: candidate.sha256, integrity: candidate.integrity } } };
	writeFileSync(trainPath(world), `${JSON.stringify(record, null, "\t")}\n`);

	const lantern = world.dir("lantern");
	const adopt: Record<string, string> = {};
	for (const file of ["package.json", "pnpm-lock.yaml", "package-lock.json"]) {
		adopt[file] = readFileSync(resolve(lantern, file), "utf8").split(final.url).join(candidate.url).split(final.integrity).join(candidate.integrity);
	}
	world.land("lantern", adopt, "Adopt schema-in-the-mist v1.0.1-rc.1");
	ok(world.supervise(["approve", "--verify"], { topology }), "verify after adoption");

	const unknown = world.archive("schema-in-the-mist", "v9.9.9");
	world.land("lantern", { "pnpm-lock.yaml": `${adopt["pnpm-lock.yaml"]}# ${unknown.url}\n` }, "Pin an archive nobody observed");
	let result = world.supervise(["approve", "--verify"], { topology });
	assert.equal(result.status, 1, result.stderr);
	assert.ok(result.stderr.includes(`introduces ${unknown.url} in pnpm-lock.yaml`), result.stderr);

	const outside = world.land("obsidian-handbook", { "src/main.ts": "export const late = 1;\n" }, "late fix");
	result = world.supervise(["approve", "--verify"], { topology });
	assert.equal(result.status, 1);
	assert.ok(result.stderr.includes(`obsidian-handbook: commit ${outside.slice(0, 10)} changes src/main.ts, outside the train files`), result.stderr);
	assert.match(result.stderr, /supervise present/);
});

scenario("a failing validation makes the train not presentable and approve refuses it", (world) => {
	const topology = testTopology(world, { "schema-in-the-mist": [["sh", "-c", "echo contract broken >&2; exit 3"]] });
	doneTrain(world);
	const result = world.supervise(["present"], { topology });
	assert.equal(result.status, 1, result.stderr);
	assert.match(result.stdout, /\*\*Not presentable\*\*/);
	assert.match(result.stdout, /schema-in-the-mist: sh -c echo contract broken >&2; exit 3 exited 3/);
	assert.match(result.stdout, /contract broken/);
	const approve = superviseTty(world, ["approve"], `${TRAIN_ID}\n`, topology);
	assert.equal(approve.status, 1, approve.stdout);
	assert.match(approve.stdout, /not presentable/);
	assert.equal(readRecord(world).approval, null);
});

scenario("a validation cannot release, push or tag: the guard refuses, ordinary calls go through", (world) => {
	const ghLog = resolve(world.tmp, "real-gh.log");
	writeFileSync(resolve(world.bin, "gh"), `#!/bin/sh\necho "$*" >> "${ghLog}"\n`, { mode: 0o755 });
	const attempt = [
		"gh release create v9.9.9 dist.tgz && exit 11",
		"gh api -X POST repos/o/r/dispatches && exit 12",
		"gh workflow run release.yml && exit 13",
		"git push origin HEAD:main && exit 14",
		"git tag v9.9.9 && exit 15",
		"gh issue list || exit 16",
		"git status --short || exit 17",
		"git tag -l || exit 18",
		"echo guarded",
	].join("; ");
	const topology = testTopology(world, { "schema-in-the-mist": [["sh", "-c", attempt]] });
	doneTrain(world);
	const mist = world.dir("schema-in-the-mist");
	const remote = git(mist, "ls-remote", "origin", "refs/heads/main", "refs/tags/*");
	const report = ok(world.supervise(["present"], { topology }), "present");
	assert.match(report, /passed: `sh -c gh release create/);
	const calls = readFileSync(ghLog, "utf8");
	assert.equal(calls, "issue list\n", `the real gh saw: ${calls}`);
	assert.equal(git(mist, "ls-remote", "origin", "refs/heads/main", "refs/tags/*"), remote, "a validation moved the remote");
	const gitCalls = readFileSync(world.gitLog, "utf8");
	assert.doesNotMatch(gitCalls, /^push/m, "a push reached git");
	assert.doesNotMatch(gitCalls, /^tag v9/m, "a tag reached git");
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
