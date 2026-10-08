/**
 * `publish`, `converge`, `release` and `close`: take a presented train from its
 * providers' finals to its closed coordination issue. `ship` runs them all
 * after committing and presenting the change (`ship.mjs`).
 *
 * `publish` without `--run` only shows the next step and the exact command;
 * with `--run` it executes every step a machine may take, one after the
 * other, watches the runs, stops at the first one that needs a person, and
 * once every final is out goes on with `converge --run`. `converge` proves
 * the consumers adopted every final; with `--run` it adopts them first.
 * `release` shows the next release step of the consumers; with `--run` it
 * tags and publishes each one, the coordinator last. `close` checks those
 * releases and, with `--run`, closes the issues, the coordination issue last.
 */
import { closeTrain } from "./close.mjs";
import { releaseTrain } from "./consumerRelease.mjs";
import { convergeTrain } from "./converge.mjs";
import { publishTrain } from "./publish.mjs";
import { shipTrain } from "./ship.mjs";
import { resolveTrain } from "./train.mjs";
import { SupervisorError } from "./topology.mjs";

function openTrainFile(context, values, label) {
	const { train, file } = resolveTrain(context.root, context.topology, values.train);
	if (train.status !== "open") throw new SupervisorError(`${label}: train "${train.id}" is closed`);
	return file;
}

export const PUBLISH_COMMANDS = {
	ship: {
		usage: "ship [--message <text>] [--fresh] [--run]  show the whole cycle of a validated change; --run commits, presents, publishes, converges, releases and closes",
		options: { train: { type: "string" }, message: { type: "string" }, fresh: { type: "boolean" }, run: { type: "boolean" } },
		run(context, values) {
			const message = (values.message ?? "").trim();
			if (values.message !== undefined && !message) throw new SupervisorError("ship: --message is empty", 2);
			return shipTrain(context, openTrainFile(context, values, "ship"), { message, run: Boolean(values.run), fresh: Boolean(values.fresh) });
		},
	},
	publish: {
		usage: "publish [--run]                           show the next publication step of a presented train; --run executes them all, then converges",
		options: { train: { type: "string" }, run: { type: "boolean" } },
		run(context, values) {
			const file = openTrainFile(context, values, "publish");
			const { code, published } = publishTrain(context, file, { run: Boolean(values.run) });
			if (!values.run || !published || code !== 0) return code;
			console.log("");
			return convergeTrain(context, file, { run: true });
		},
	},
	converge: {
		usage: "converge [--run]                          prove every consumer pins every final, then run the convergence checks; --run adopts the finals and lands the records first",
		options: { train: { type: "string" }, run: { type: "boolean" } },
		run(context, values) {
			return convergeTrain(context, openTrainFile(context, values, "converge"), { run: Boolean(values.run) });
		},
	},
	release: {
		usage: "release [--run]                           show the next release step of the consumers of a converged train; --run tags and publishes each one, the coordinator last",
		options: { train: { type: "string" }, run: { type: "boolean" } },
		run(context, values) {
			return releaseTrain(context, openTrainFile(context, values, "release"), { run: Boolean(values.run) });
		},
	},
	close: {
		usage: "close [--run]                             check the consumer releases; --run closes the issues, the coordination issue last",
		options: { train: { type: "string" }, run: { type: "boolean" } },
		run(context, values) {
			return closeTrain(context, openTrainFile(context, values, "close"), { run: Boolean(values.run) });
		},
	},
};
