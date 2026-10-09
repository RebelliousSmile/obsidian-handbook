/**
 * The Handbook a producer pins in its workflows, against what its packs require.
 *
 * `ci.yml` and `release.yml` of a producer check out Handbook at a fixed commit
 * and validate its packs against it. A pack that requires a capability that
 * commit does not declare fails there, after a whole cycle of presentation and
 * publication. The refusal comes first: it reads the pins, the `requires` of
 * the producer's packs, and the capabilities that commit of Handbook declares.
 * No version or SHA is written here: every one is read from the repository
 * that declares it.
 */
import { fetchOrigin, git, listTree, revParse, showFile } from "./git.mjs";
import { SupervisorError, coordinatorOf, repoDir } from "./topology.mjs";

const HANDBOOK_REPOSITORY = "RebelliousSmile/obsidian-handbook";
const CAPABILITIES_FILE = "src/games/capabilities.ts";
const WORKFLOWS = ".github/workflows";
const PACKS = "handbook";

/** Every commit a workflow checks Handbook out at: `repository: <handbook>` followed by its `ref:`. */
export function pinnedHandbookRefs(text) {
	const refs = [];
	const lines = text.replace(/\r\n/g, "\n").split("\n");
	for (let index = 0; index < lines.length; index += 1) {
		if (!new RegExp(`repository:\\s*${HANDBOOK_REPOSITORY}\\s*$`).test(lines[index])) continue;
		for (let next = index + 1; next < lines.length && next <= index + 3; next += 1) {
			const ref = /^\s*ref:\s*['"]?([^\s'"#]+)/.exec(lines[next])?.[1];
			if (ref) {
				// An expression (`${{ … }}`) is no fixed commit: the workflow computes it.
				if (!ref.includes("${{")) refs.push(ref);
				break;
			}
		}
	}
	return refs;
}

/** Every `<family>:<name>` literal of the capabilities source: the list is composed there, never exported whole. */
export function declaredCapabilities(source) {
	const found = new Set();
	for (const match of source.matchAll(/["'`]([a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*)["'`]/g)) found.add(match[1]);
	return found;
}

/** The union of the `requires` of the given manifests (JSON texts); an unreadable manifest is skipped, the producer's own checks name it. */
export function requiredCapabilities(manifests) {
	const required = new Set();
	for (const text of manifests) {
		try {
			const requires = JSON.parse(text).requires;
			for (const capability of Array.isArray(requires) ? requires : []) if (typeof capability === "string") required.add(capability);
		} catch {
			// not a manifest the guard can read
		}
	}
	return required;
}

/**
 * The refusals for one producer. `workflows` maps a workflow file to its text;
 * `handbook.capabilitiesAt(ref)` is the capabilities source at that commit, or
 * null when the commit is unknown; `handbook.head` is the tip of Handbook's main.
 */
export function producerPinProblems({ id, workflows, manifests, handbook }) {
	const pins = [];
	for (const [file, text] of Object.entries(workflows)) {
		for (const ref of pinnedHandbookRefs(text)) pins.push({ file, ref });
	}
	if (pins.length === 0) return [];
	const required = requiredCapabilities(manifests);
	const problems = [];
	const distinct = [...new Set(pins.map((pin) => pin.ref))];
	if (distinct.length > 1) {
		problems.push(`${id}: its workflows pin different Handbook commits (${pins.map((pin) => `${pin.file}: ${pin.ref.slice(0, 10)}`).join(", ")}); pin one commit in all of them`);
	}
	for (const ref of distinct) {
		const files = pins.filter((pin) => pin.ref === ref).map((pin) => pin.file).join(", ");
		const source = handbook.capabilitiesAt(ref);
		if (source === null) {
			problems.push(`${id}: ${files} pins Handbook ${ref.slice(0, 10)}, which Handbook does not have; pin a commit of its main (now ${(handbook.head ?? "unknown").slice(0, 10)})`);
			continue;
		}
		const declared = declaredCapabilities(source);
		const missing = [...required].filter((capability) => !declared.has(capability)).sort();
		if (missing.length > 0) {
			problems.push(`${id}: ${files} pins Handbook ${ref.slice(0, 10)}, which does not declare ${missing.join(", ")} required by its packs; pin a later commit of Handbook's main (now ${(handbook.head ?? "unknown").slice(0, 10)}) in those files`);
		}
	}
	return problems;
}

/** Refuse before any validation when a provider's pinned Handbook lags what its packs require. */
export function checkProducerPins(root, topology, repos) {
	const coordinator = coordinatorOf(topology);
	const handbookDir = repoDir(root, coordinator);
	const providers = repos.filter((repo) => repo.role === "provider");
	const problems = [];
	let fetched = false;
	for (const provider of providers) {
		const dir = repoDir(root, provider);
		const workflows = {};
		for (const name of listTree(dir, "HEAD", WORKFLOWS)) {
			const text = showFile(dir, "HEAD", `${WORKFLOWS}/${name}`);
			if (text !== null) workflows[name] = text;
		}
		if (!Object.values(workflows).some((text) => pinnedHandbookRefs(text).length > 0)) continue;
		if (!fetched) {
			fetchOrigin(handbookDir);
			fetched = true;
		}
		const manifests = listTree(dir, "HEAD", PACKS)
			.map((pack) => showFile(dir, "HEAD", `${PACKS}/${pack}/pack.json`))
			.filter((text) => text !== null);
		problems.push(...producerPinProblems({
			id: provider.id,
			workflows,
			manifests,
			handbook: {
				head: revParse(handbookDir, "origin/main") ?? undefined,
				capabilitiesAt: (ref) => (git(handbookDir, ["cat-file", "-e", `${ref}^{commit}`]).status === 0 ? showFile(handbookDir, ref, CAPABILITIES_FILE) : null),
			},
		}));
	}
	if (problems.length > 0) throw new SupervisorError(`present: a producer pins a Handbook that lags its packs\n  ${problems.join("\n  ")}`, 1);
}
