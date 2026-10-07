/**
 * What `present` validates a consumer against: the train's own providers.
 *
 * A consumer is pinned to the last published provider. When the train changes
 * that provider's contract, validating the consumer on the pin measures the
 * old contract, so the train could never be presented. As `preview` does for
 * the bundle, the consumer's installed copy of each provider the train changes
 * is pointed at the provider's checkout for the duration of its validations,
 * then put back. Nothing tracked is written: only a link under `node_modules`.
 *
 * The link does not target the checkout itself: resolved from there, the
 * provider would find its own `node_modules` (its own zod, its own types) and
 * not the consumer's, which two copies of one library make incompatible. The
 * checkout is copied beside the siblings pnpm gives the installed package, so
 * it resolves its dependencies as the published package will (the consumer's
 * own copy of a library both install, as a re-resolved lock would give).
 */
import { cpSync, lstatSync, mkdirSync, readdirSync, readlinkSync, realpathSync, rmSync, symlinkSync, unlinkSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
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

/** A copy of the checkout, set among the dependencies of the package it replaces. */
function stageProvider(consumerDir, link, original, staged) {
	const depth = link.name.split("/").length;
	let modules = realpathSync(original);
	for (let level = 0; level < depth; level += 1) modules = dirname(modules);
	if (basename(modules) !== "node_modules") return null;
	const root = join(consumerDir, "node_modules", ".train-providers", link.name.replace(/[^a-zA-Z0-9.-]/g, "_"));
	rmSync(root, { recursive: true, force: true });
	const stagedModules = join(root, "node_modules");
	const top = link.name.split("/")[0];
	const copy = join(stagedModules, ...link.name.split("/"));
	mkdirSync(dirname(copy), { recursive: true });
	staged.push(root);
	cpSync(resolve(link.dir), copy, {
		recursive: true,
		filter: (source) => !["node_modules", ".git"].includes(basename(source)),
	});
	for (const entry of readdirSync(modules)) {
		if (entry === top) continue;
		const sibling = join(stagedModules, entry);
		// A dependency the consumer installs itself is the consumer's copy: adopting the provider re-resolves the lock onto it.
		const own = join(consumerDir, "node_modules", entry);
		symlinkSync(realpathSync(lstatSync(own, { throwIfNoEntry: false }) ? own : join(modules, entry)), sibling, "junction");
		staged.push(sibling);
	}
	return copy;
}

/**
 * Run `fn` with each package of `links` redirected to its checkout. Only a
 * link is replaced (pnpm's layout); a real directory is refused, not moved,
 * and a package that is not installed is left alone.
 * The original link is restored whatever `fn` does.
 */
export function withProviderLinks(consumerDir, links, fn) {
	const swapped = [];
	const staged = [];
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
		// The sibling links first: removing the copy must never reach into the install they point at.
		for (const path of staged.reverse()) {
			if (lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink()) unlinkSync(path);
			else rmSync(path, { recursive: true, force: true });
		}
	}
}
