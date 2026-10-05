/**
 * What a presentation binds, and its fingerprint.
 *
 * The concerned repositories are the train's items plus every consumer of a
 * provider in the train: those are the ones that will receive the adoption
 * commits. The fingerprint is a sha256 over a canonical form of the train id,
 * each repository's SHA, the train files it admits after the presentation and
 * the publications the presentation covers. Same inputs, same fingerprint.
 */
import { createHash } from "node:crypto";
import { repoById } from "./topology.mjs";

/** Repositories a train touches: items first, then affected consumers, the coordinator last. */
export function concernedRepos(topology, train) {
	const ids = new Set(train.items.map((item) => item.repo));
	for (const item of train.items) {
		for (const consumer of repoById(topology, item.repo).consumers ?? []) ids.add(consumer);
	}
	const rank = { provider: 0, consumer: 1, coordinator: 2 };
	return topology.repos
		.filter((repo) => ids.has(repo.id))
		.sort((left, right) => rank[left.role] - rank[right.role]);
}

/** The publications a presentation covers, in the order they will happen. */
export function announcedPublications(topology, train) {
	const repos = concernedRepos(topology, train);
	const providers = repos.filter((repo) => repo.role === "provider" && train.items.some((item) => item.repo === repo.id));
	const order = train.items.map((item) => item.repo);
	providers.sort((left, right) => order.indexOf(left.id) - order.indexOf(right.id));
	return [
		...providers.flatMap((provider) => [
			`${provider.id}: release candidate of ${provider.package}`,
			`${provider.id}: final release of ${provider.package}, same bytes as the candidate`,
		]),
		...repos.filter((repo) => repo.role !== "provider").map((repo) => `${repo.id}: release`),
	];
}

function canonical(value) {
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	if (value && typeof value === "object") {
		return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
	}
	return JSON.stringify(value);
}

/** `{ id, repos: [{repo, sha}], trainFiles: {repo: [...]}, publications: [...] }` → "sha256:<hex>". */
export function computeDigest({ id, repos, trainFiles, publications }) {
	const subject = {
		id,
		repos: [...repos].map(({ repo, sha }) => ({ repo, sha })).sort((left, right) => left.repo.localeCompare(right.repo)),
		trainFiles,
		publications,
	};
	return `sha256:${createHash("sha256").update(canonical(subject)).digest("hex")}`;
}

export function trainFilesOf(repos) {
	return Object.fromEntries(repos.map((repo) => [repo.id, [...repo.trainFiles]]));
}
