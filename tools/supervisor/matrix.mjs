/**
 * The provider registry a consumer keeps (`matrix` in the topology, Lantern's
 * `release-train.matrix.json`): the Handbook commit its release inputs are
 * read at, and the published manifests of each provider it proves.
 *
 * Once the finals are adopted, convergence points it at them: each provider of
 * the train at its origin/main, with its train manifest listed at that commit,
 * and the Handbook at origin/main, which pins every final. Not at the final
 * tag: schema-pbta tags the provider commit, which precedes its manifest. The
 * registry is a train file of the consumer, so landing it keeps the approval.
 */
import { revParse, showFile } from "./git.mjs";
import * as pbta from "./adapters/pbta.mjs";
import * as adrenaline from "./adapters/adrenaline.mjs";
import * as mist from "./adapters/mist.mjs";
import { repoDir, SupervisorError } from "./topology.mjs";

const ADAPTERS = { pbta, adrenaline, mist };

/**
 * The content `repo`'s registry should hold for the finals of `published`, or
 * null when origin/main already holds it.
 */
export function matrixUpdate(root, topology, published, repo, label) {
	const dir = repoDir(root, repo);
	const text = showFile(dir, "origin/main", repo.matrix);
	if (text === null) throw new SupervisorError(`${label}: ${repo.id} has no ${repo.matrix} on origin/main`, 1);
	const matrix = JSON.parse(text);
	const handbook = topology.repos.find((entry) => entry.repository === matrix.handbook?.repository);
	if (!handbook) throw new SupervisorError(`${label}: ${repo.matrix} of ${repo.id} names ${matrix.handbook?.repository ?? "no Handbook"}, which is not in the topology`, 1);
	matrix.handbook.ref = revParse(repoDir(root, handbook), "origin/main");
	for (const { repo: provider, final } of published) {
		const entry = (matrix.providers ?? []).find((item) => item.provider === provider.id);
		if (!entry) throw new SupervisorError(`${label}: ${repo.matrix} of ${repo.id} does not list ${provider.id}`, 1);
		const sha = revParse(repoDir(root, provider), "origin/main");
		const path = ADAPTERS[provider.adapter].trainManifest(provider, final.tag);
		if (showFile(repoDir(root, provider), sha, path) === null) throw new SupervisorError(`${label}: ${provider.id} has no ${path} on origin/main`, 1);
		entry.ref = sha;
		if (!entry.manifests.some((manifest) => manifest.path === path)) entry.manifests.push({ path, validatorRef: sha });
	}
	const indent = /\n([ \t]+)"/.exec(text)?.[1] ?? "\t";
	const eol = text.includes("\r\n") ? "\r\n" : "\n";
	const next = JSON.stringify(matrix, null, indent).split("\n").join(eol) + (/\r?\n$/.test(text) ? eol : "");
	return next === text ? null : next;
}
