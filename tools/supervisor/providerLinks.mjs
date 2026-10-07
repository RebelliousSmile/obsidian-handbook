/**
 * What `present` validates a consumer against: the train's own providers.
 *
 * A consumer is pinned to the last published provider. When the train changes
 * that provider's contract, validating the consumer on the pin measures the
 * old contract, so the train could never be presented. As `preview` does for
 * the bundle, the consumer's installed copy of each provider the train changes
 * is replaced by the provider's own content for the duration of its
 * validations, then put back. Nothing tracked is written: only a link under
 * `node_modules`.
 *
 * What replaces it is what the candidate will hold, not the checkout: only
 * the files the package publishes (`packedFiles.mjs`) are copied. A consumer
 * that reads a file the provider leaves out of its package fails here, before
 * any candidate exists, as it would fail on the archive.
 *
 * The link does not target the checkout itself for a second reason: resolved
 * from there, the provider would find its own `node_modules` (its own zod, its
 * own types) and not the consumer's, which two copies of one library make
 * incompatible. The files are copied beside the siblings pnpm gives the
 * installed package, so the copy resolves its dependencies as the published
 * package will (the consumer's own copy of a library both install, as a
 * re-resolved lock would give).
 */
import { cpSync, lstatSync, mkdirSync, readdirSync, readlinkSync, realpathSync, rmdirSync, rmSync, symlinkSync, unlinkSync } from "node:fs";
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

const STAGE_DIR = ".train-providers";

/**
 * A copy of the files `link.files` of the checkout, set among the dependencies
 * of the package it replaces. An installed package that does not sit in a
 * `node_modules` (a link to a directory elsewhere) has no sibling to take
 * over: the copy then resolves from the consumer's own `node_modules`.
 */
function stageProvider(consumerDir, link, original, staged) {
	const depth = link.name.split("/").length;
	let modules = realpathSync(original);
	for (let level = 0; level < depth; level += 1) modules = dirname(modules);
	const root = join(consumerDir, "node_modules", STAGE_DIR, link.name.replace(/[^a-zA-Z0-9.-]/g, "_"));
	rmSync(root, { recursive: true, force: true });
	const stagedModules = join(root, "node_modules");
	const top = link.name.split("/")[0];
	const copy = join(stagedModules, ...link.name.split("/"));
	mkdirSync(dirname(copy), { recursive: true });
	staged.push(root);
	for (const file of link.files) {
		mkdirSync(dirname(join(copy, file)), { recursive: true });
		cpSync(resolve(link.dir, file), join(copy, file));
	}
	if (basename(modules) !== "node_modules") return copy;
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
 * Run `fn` with each package of `links` replaced by the files its provider
 * publishes (`link.files`, relative to `link.dir`). Only a link is replaced
 * (pnpm's layout); a real directory is refused, not moved, and a package that
 * is not installed is left alone. `fn` receives the links that were replaced.
 * The original link is restored and the copies removed whatever `fn` does.
 */
export function withProviderLinks(consumerDir, links, fn) {
	const swapped = [];
	const staged = [];
	const replaced = [];
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
			const stage = stageProvider(consumerDir, link, target, staged);
			unlinkSync(target);
			symlinkSync(stage, target, "junction");
			replaced.push(link);
		}
		return fn(replaced);
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
		if (staged.length > 0) {
			try {
				rmdirSync(join(consumerDir, "node_modules", STAGE_DIR));
			} catch {
				// Not empty: a copy this run did not make is not this run's to remove.
			}
		}
	}
}
