/**
 * A consumer's own vite dev server, started by `supervise preview` in the
 * consumer's directory: its config file is loaded as is, and the train's
 * packages resolve to their checkouts through aliases merged on top. Neither
 * the consumer's package.json nor its lockfiles are touched.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const settings = JSON.parse(process.env.SUPERVISOR_PREVIEW_SERVER ?? "null");
if (!settings) {
	console.error("previewServer: run through supervise preview");
	process.exit(2);
}

/** The consumer's own vite, as it would import it. */
async function importVite(dir) {
	const packageDir = join(dir, "node_modules", "vite");
	const file = join(packageDir, "package.json");
	if (!existsSync(file)) throw new Error(`${dir} has no node_modules/vite; install its dependencies first`);
	const manifest = JSON.parse(readFileSync(file, "utf8"));
	let entry = manifest.exports?.["."] ?? manifest.module ?? manifest.main;
	while (entry && typeof entry === "object") entry = entry.import ?? entry.default;
	if (typeof entry !== "string") throw new Error("the ES entry of vite cannot be found");
	return import(pathToFileURL(join(packageDir, entry)).href);
}

const vite = await importVite(settings.dir);
const server = await vite.createServer({
	root: settings.dir,
	configFile: settings.configFile,
	resolve: { alias: settings.aliases.map(({ find, replacement }) => ({ find: new RegExp(find), replacement })) },
	server: {
		fs: { allow: [vite.searchForWorkspaceRoot(settings.dir), ...settings.allow] },
		open: settings.open,
		...(settings.port === undefined ? {} : { port: settings.port }),
	},
});
await server.listen();
server.printUrls();

// The command that started this server is its owner: once it is gone, nothing would stop the server.
const parent = process.ppid;
setInterval(() => {
	try {
		process.kill(parent, 0);
	} catch (error) {
		if (error?.code === "ESRCH") {
			void server.close().finally(() => process.exit(0));
		}
	}
}, 2000).unref();
