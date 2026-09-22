import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve, sep } from "node:path";
import { PBTA_CONTRACT_VERSION } from "schema-pbta";

/**
 * Reads the cross-tool metadata schema-pbta publishes: the provider descriptor and
 * the pack contracts its `packManifest` glob names.
 *
 * This lives in tools/ and not in the plugin bundle on purpose. `packManifest` is a glob, and a
 * bundle cannot enumerate one: adopting it there would mean freezing six named imports — the very
 * list the upstream metadata is supposed to replace. So Handbook keeps declaring what it supports,
 * and this reader is what proves the declaration against the pinned tarball.
 */

export interface PbtaPublishedDocument {
	target: string;
	/** Corpus-relative path, as the pack contract names it. */
	fixture: string;
	/** The same fixture resolved on disk, inside the package. */
	fixturePath: string;
}

export interface PbtaPublishedPack {
	id: string;
	label: string;
	documents: PbtaPublishedDocument[];
	targets: string[];
	/** What the pack asks of Handbook, as capability names. */
	requirements: string[];
}

export interface PbtaProviderContract {
	providerVersion: number;
	contractVersion: number;
	/** Capabilities the provider says a Handbook build needs to carry its documents. */
	capabilities: string[];
	packs: PbtaPublishedPack[];
}

function packageRoot(): string {
	const requireFromProject = createRequire(resolve(process.cwd(), "package.json"));
	/* The package root is derived from cross-tool-provider.json, the one export that sits at the root.
	   Deriving it from the corpus instead — dirname(dirname(casesPath)), the pattern the adrenaline
	   helper can afford — yields corpus/ here: schema-pbta remaps ./corpus/* to corpus/contract/*. */
	return dirname(requireFromProject.resolve("schema-pbta/cross-tool-provider.json"));
}

function inside(root: string, path: string, what: string): string {
	const resolved = resolve(root, path);
	if (!resolved.startsWith(`${root}${sep}`)) throw new Error(`${what}: escapes the schema-pbta package root`);
	return resolved;
}

function readStringArray(value: unknown, what: string): string[] {
	if (!Array.isArray(value)) throw new Error(`${what} is not an array`);
	return value.map((entry, index) => {
		if (typeof entry !== "string" || entry.length === 0) throw new Error(`${what}[${index}] is not a name`);
		return entry;
	});
}

/** The manifests a single-star glob names, one per directory, in sorted order. */
function globbedManifests(root: string, pattern: string): string[] {
	const star = pattern.indexOf("*");
	if (star < 0 || pattern.indexOf("*", star + 1) >= 0) {
		throw new Error(`packManifest is not a single-star glob: ${pattern}`);
	}
	const prefix = pattern.slice(0, star).replace(/\/$/, "");
	const suffix = pattern.slice(star + 1).replace(/^\//, "");
	const parent = inside(root, prefix, `packManifest prefix ${prefix}`);
	const names = readdirSync(parent, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
	return names.map((name) => inside(root, `${prefix}/${name}/${suffix}`, `pack manifest for ${name}`));
}

function readPack(root: string, corpusRoot: string, manifestPath: string, contractVersion: number): PbtaPublishedPack {
	const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
	if (raw.manifestVersion !== 1) throw new Error(`${manifestPath}: manifestVersion ${String(raw.manifestVersion)} is not 1`);
	if (raw.contractVersion !== contractVersion) {
		throw new Error(`${manifestPath}: contractVersion ${String(raw.contractVersion)} disagrees with the provider`);
	}
	const pack = raw.pack as { id?: unknown; label?: unknown } | undefined;
	if (!pack || typeof pack.id !== "string" || pack.id.length === 0) throw new Error(`${manifestPath}: pack.id is missing`);
	if (!Array.isArray(raw.documents) || raw.documents.length === 0) throw new Error(`${manifestPath}: documents is empty`);
	const documents = raw.documents.map((entry, index) => {
		const document = entry as { target?: unknown; fixture?: unknown };
		if (typeof document.target !== "string" || document.target.length === 0) {
			throw new Error(`${manifestPath}: documents[${index}].target is missing`);
		}
		if (typeof document.fixture !== "string" || document.fixture.length === 0) {
			throw new Error(`${manifestPath}: documents[${index}].fixture is missing`);
		}
		const fixturePath = inside(corpusRoot, document.fixture, `${pack.id} fixture ${document.fixture}`);
		/* A fixture the tarball does not carry makes the pack contract unprovable, and the two ship
		   together: this is an incoherence of the pinned version, not a cadence difference. */
		if (!statSync(fixturePath, { throwIfNoEntry: false })?.isFile()) {
			throw new Error(`${manifestPath}: fixture ${document.fixture} is not in the published corpus`);
		}
		return { target: document.target, fixture: document.fixture, fixturePath };
	});
	const requirements = raw.requirements as { handbook?: unknown } | undefined;
	return {
		id: pack.id,
		label: typeof pack.label === "string" ? pack.label : pack.id,
		documents,
		targets: documents.map((document) => document.target),
		requirements: readStringArray(requirements?.handbook ?? [], `${manifestPath}: requirements.handbook`),
	};
}

/**
 * Loads the provider descriptor and every pack contract it points at. An unknown envelope throws
 * naming the field: a contract this build has never seen is not something to guess at.
 */
export function loadPbtaProviderContract(): PbtaProviderContract {
	const root = packageRoot();
	const descriptor = JSON.parse(readFileSync(resolve(root, "cross-tool-provider.json"), "utf8")) as Record<string, unknown>;
	if (descriptor.providerVersion !== 1) {
		throw new Error(`cross-tool-provider.json: providerVersion ${String(descriptor.providerVersion)} is not 1`);
	}
	if (descriptor.contractVersion !== PBTA_CONTRACT_VERSION) {
		throw new Error(`cross-tool-provider.json: contractVersion ${String(descriptor.contractVersion)} is not ${PBTA_CONTRACT_VERSION}`);
	}
	if (typeof descriptor.corpus !== "string" || typeof descriptor.packManifest !== "string") {
		throw new Error("cross-tool-provider.json: corpus and packManifest must be paths");
	}
	const capabilities = descriptor.capabilities as { handbook?: unknown } | undefined;
	const corpusRoot = dirname(inside(root, descriptor.corpus, `corpus ${descriptor.corpus}`));
	const packs = globbedManifests(root, descriptor.packManifest).map((manifestPath) =>
		readPack(root, corpusRoot, manifestPath, descriptor.contractVersion as number),
	);
	if (packs.length === 0) throw new Error(`cross-tool-provider.json: ${descriptor.packManifest} names no pack`);
	return {
		providerVersion: descriptor.providerVersion,
		contractVersion: descriptor.contractVersion,
		capabilities: readStringArray(capabilities?.handbook, "cross-tool-provider.json: capabilities.handbook"),
		packs,
	};
}
