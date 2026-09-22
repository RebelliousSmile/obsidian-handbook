import { requestUrl } from "obsidian";
import { SchemaSource, SchemaSourceReference } from "./sources";

export interface ResolvedGithubSource {
	revision: string;
	releaseTag?: string;
	readText(path: string): Promise<string>;
	readBinary(path: string): Promise<ArrayBuffer>;
}

function api(repository: string, suffix: string): string {
	return `https://api.github.com/repos/${repository}${suffix}`;
}

async function json(url: string): Promise<Record<string, unknown>> {
	let response;
	try {
		response = await requestUrl({ url, headers: { Accept: "application/vnd.github+json" } });
	} catch (error) {
		throw new Error(`GitHub request failed for ${url}: ${String(error)}`);
	}
	if (response.status < 200 || response.status >= 300 || !response.json || typeof response.json !== "object") throw new Error(`GitHub returned ${response.status} for ${url}`);
	return response.json as Record<string, unknown>;
}

async function resolveReference(repository: string, reference: SchemaSourceReference): Promise<{ revision: string; releaseTag?: string }> {
	if (reference.kind === "latest") {
		const release = await json(api(repository, "/releases/latest"));
		if (typeof release.tag_name !== "string" || release.tag_name.length === 0) throw new Error("GitHub latest release has no tag");
		if (typeof release.target_commitish === "string" && /^[0-9a-f]{40}$/i.test(release.target_commitish)) {
			return { revision: release.target_commitish, releaseTag: release.tag_name };
		}
		return resolveReference(repository, { kind: "tag", value: release.tag_name });
	}
	const kind = reference.kind === "tag" ? "tags" : "heads";
	const ref = await json(api(repository, `/git/ref/${kind}/${encodeURIComponent(reference.value)}`));
	const object = ref.object as Record<string, unknown> | undefined;
	if (!object || typeof object.sha !== "string") throw new Error(`GitHub did not resolve ${reference.value}`);
	if (object.type === "commit") return { revision: object.sha, releaseTag: reference.kind === "tag" ? reference.value : undefined };
	const tag = await json(api(repository, `/git/tags/${object.sha}`));
	const target = tag.object as Record<string, unknown> | undefined;
	if (!target || typeof target.sha !== "string" || target.type !== "commit") throw new Error(`GitHub tag ${reference.value} does not name a commit`);
	return { revision: target.sha, releaseTag: reference.kind === "tag" ? reference.value : undefined };
}

export async function resolveGithubSource(source: SchemaSource): Promise<ResolvedGithubSource> {
	const { revision, releaseTag } = await resolveReference(source.repository, source.reference);
	const read = async (path: string) => {
		const url = `https://raw.githubusercontent.com/${source.repository}/${revision}/${path}`;
		let response;
		try {
			response = await requestUrl({ url });
		} catch (error) {
			throw new Error(`GitHub request failed for ${url}: ${String(error)}`);
		}
		if (response.status < 200 || response.status >= 300) throw new Error(`GitHub returned ${response.status} for ${path}`);
		return response;
	};
	return {
		revision,
		releaseTag,
		readText: async (path) => (await read(path)).text,
		readBinary: async (path) => (await read(path)).arrayBuffer,
	};
}
