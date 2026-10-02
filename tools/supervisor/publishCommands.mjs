/**
 * `publish`, `converge` and `close`: take an approved train from its providers'
 * finals to its closed coordination issue.
 *
 * `publish` without `--run` only shows the next step and the exact command;
 * with `--run` it executes every step a machine may take, one after the
 * other, watches the runs, stops at the first one that needs a person, and
 * once every final is out goes on with `converge --run`. `converge` proves
 * the consumers adopted every final; with `--run` it adopts them first.
 * `close` checks the consumer releases and, with `--run`, closes the issues,
 * the coordination issue last.
 */
import { closeTrain } from "./close.mjs";
import { convergeTrain } from "./converge.mjs";
import { publishTrain } from "./publish.mjs";
import { resolveTrain } from "./train.mjs";
import { SupervisorError } from "./topology.mjs";

function openTrainFile(context, values, label) {
	const { train, file } = resolveTrain(context.root, context.topology, values.train);
	if (train.status !== "open") throw new SupervisorError(`${label}: train "${train.id}" is closed`);
	return file;
}

export const PUBLISH_COMMANDS = {
	publish: {
		usage: "publish [--run]                           show the next publication step of an approved train; --run executes them all, then converges",
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
	close: {
		usage: "close [--run]                             check the consumer releases; --run closes the issues, the coordination issue last",
		options: { train: { type: "string" }, run: { type: "boolean" } },
		run(context, values) {
			return closeTrain(context, openTrainFile(context, values, "close"), { run: Boolean(values.run) });
		},
	},
};
