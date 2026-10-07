/**
 * What `present` validates a consumer against: the train's own providers.
 *
 * A consumer is pinned to the last published provider. When the train changes
 * that provider's contract, validating the consumer on the pin measures the
 * old contract, so the train could never be presented. As `preview` does for
 * the bundle, the consumer's installed copy of each provider the train changes
 * is pointed at the provider's checkout for the duration of its validations,
 * then put back. Nothing tracked is written: only a link under `node_modules`.
 */
import { lstatSync, readlinkSync, symlinkSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { concernedRepos } from "./digest.mjs";
import { packageJson } from "./preview.mjs";
import { repoDir, SupervisorError } from "./topology.mjs";

/** The installed packages of `consumerDir` the train's providers replace. */
export function planProviderLinks(root, topology, train, consumer) {
	const manifest = packageJson(repoDir(root, consumer));
	const declares = (name) => Boolean(manifest?.dependencies?.[name] ?? manifest?.devDependencies?.[name]);
	return concernedRepos(topology, train)
		.filter((repo) => repo.role === "provider" && train.items.some((item) => item.repo === repo.id))
		.map((repo) => {
			const dir = repoDir(root, repo);
			return { repo: repo.id, name: packageJson(dir)?.name ?? repo.package, dir };
		})
		.filter((provider) => provider.name && declares(provider.name));
}

/**
 * Run `fn` with each package of `links` redirected to its checkout. Only a
 * link is replaced (pnpm's layout); a real directory is refused, not moved,
 * and a package that is not installed is left alone.
 * The original link is restored whatever `fn` does.
 */
export function withProviderLinks(consumerDir, links, fn) {
	const swapped = [];
	try {
		for (const link of links) {
			const target = join(consumerDir, "node_modules", ...link.name.split("/"));
			let stat;
			try {
				stat = lstatSync(target);
			} catch {
				// Not installed: the validations have no copy of it to measure, a pin or a checkout.
				continue;
			}
			if (!stat.isSymbolicLink()) {
				throw new SupervisorError(`present: ${target} is a directory, not a link; reinstall with pnpm so it can be pointed at ${link.repo}`, 1);
			}
			swapped.push({ target, original: readlinkSync(target) });
			unlinkSync(target);
			symlinkSync(resolve(link.dir), target, "junction");
		}
		return fn();
	} finally {
		for (const entry of swapped.reverse()) {
			unlinkSync(entry.target);
			symlinkSync(entry.original, entry.target, "junction");
		}
	}
}
