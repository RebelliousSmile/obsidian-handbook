/**
 * `pnpm supervise <command>`: coordinate a correction across Handbook,
 * Lantern and the three schema repositories.
 *
 * The supervisor observes, records and tells who does what next. It never
 * writes code in a repository, never pulls or checks out, and never
 * publishes anything without an approval bound to the commits it presented.
 * See doc/supervisor.en.md.
 */
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { collectStatus, assertStatusShape, renderStatus } from "./supervisor/status.mjs";
import { activeTrain } from "./supervisor/train.mjs";
import { TRAIN_COMMANDS } from "./supervisor/trainCommands.mjs";
import { APPROVAL_COMMANDS } from "./supervisor/approvalCommands.mjs";
import { DEFAULT_TOPOLOGY, HANDBOOK_ROOT, loadTopology, SupervisorError } from "./supervisor/topology.mjs";

const COMMON = {
	root: { type: "string" },
	topology: { type: "string" },
	help: { type: "boolean", short: "h" },
};

const COMMANDS = {
	status: {
		usage: "status [--json] [--strict] [--no-fetch]   state of the five repositories and the active train",
		options: { json: { type: "boolean" }, strict: { type: "boolean" }, "no-fetch": { type: "boolean" }, train: { type: "string" } },
		run(context, values) {
			const status = collectStatus(context.root, context.topology, { fetch: !values["no-fetch"] });
			const train = activeTrain(context.root, context.topology, values.train);
			status.train = train ? { id: train.id, status: train.status, items: train.items.map(({ repo, issue, url, dependsOn }) => ({ repo, issue, url, dependsOn })) } : null;
			assertStatusShape(status);
			console.log(values.json ? JSON.stringify(status, null, "\t") : renderStatus(status));
			return values.strict && status.gaps.length > 0 ? 1 : 0;
		},
	},
	...TRAIN_COMMANDS,
	...APPROVAL_COMMANDS,
};

const USAGE = `usage: pnpm supervise <command> [options]

commands:
${Object.values(COMMANDS).map((command) => `  ${command.usage}`).join("\n")}

common options:
  --root <dir>        parent directory of the five repositories (default: ..)
  --topology <file>   topology file (default: supervisor/topology.json)
  --train <id>        the train to act on (default: the only open one)`;

async function main(argv) {
	const [name, ...rest] = argv.filter((argument, index) => !(index === 0 && argument === "--"));
	const command = COMMANDS[name];
	if (name === "--help" || name === "-h" || name === "help") {
		console.log(USAGE);
		return 0;
	}
	if (!command) {
		console.error(name ? `unknown command "${name}"\n\n${USAGE}` : USAGE);
		return name ? 2 : 0;
	}
	const { values, positionals } = parseArgs({
		args: rest,
		options: { ...COMMON, ...command.options },
		allowPositionals: true,
		strict: true,
	});
	if (values.help) {
		console.log(USAGE);
		return 0;
	}
	const context = {
		root: resolve(values.root ?? resolve(HANDBOOK_ROOT, "..")),
		topology: loadTopology(values.topology ? resolve(values.topology) : DEFAULT_TOPOLOGY),
	};
	return await command.run(context, values, positionals);
}

try {
	const code = await main(process.argv.slice(2));
	process.exitCode = code;
} catch (error) {
	if (error instanceof SupervisorError) {
		console.error(`supervise: ${error.message}`);
		process.exitCode = error.exitCode;
	} else if (error?.code?.startsWith?.("ERR_PARSE_ARGS")) {
		console.error(`supervise: ${error.message}\n\n${USAGE}`);
		process.exitCode = 2;
	} else {
		throw error;
	}
}
