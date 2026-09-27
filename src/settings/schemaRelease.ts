import handbookPackage from "../../package.json";

const packageByRepository = {
	"rebellioussmile/schema-pbta": "schema-pbta",
	"rebellioussmile/schema-adrenaline": "schema-adrenaline",
	"rebellioussmile/schema-in-the-mist": "schema-in-the-mist",
} as const;

/** The immutable schema archive bundled into this Handbook build. */
export function bundledSchemaRelease(repository: string): string | null {
	const packageName = packageByRepository[repository.toLowerCase() as keyof typeof packageByRepository];
	if (!packageName) return null;
	const url = handbookPackage.dependencies[packageName];
	const prefix = `https://github.com/RebelliousSmile/${packageName}/releases/download/`;
	if (!url.startsWith(prefix)) return null;
	const match = /^(v[^/]+)\/([^/]+)$/.exec(url.slice(prefix.length));
	if (!match) return null;
	return `${packageName} ${match[1]}${match[2] === "candidate.tgz" ? " (candidate.tgz)" : ""}`;
}
