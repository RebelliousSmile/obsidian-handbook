import { Editor } from "obsidian";
import type BrumesPlugin from "../../BrumesPlugin";
import { insertCallout } from "./contextMenu";
import { CalloutDefinition } from "./types";
import { scopeLabel } from "./scopeLabel";
import { visibleCallouts } from "./visibility";

function commandId(entry: CalloutDefinition): string {
	return `callout-insert-${entry.id}`;
}

/**
 * The callout's own name, suffixed by the game whenever its scope is not
 * "all" — deterministic, not only on a collision, so the two native "Note"
 * entries (City of Mist, Legend in the Mist) read apart in the command
 * palette and the Hotkeys panel.
 */
export function calloutCommandName(entry: CalloutDefinition): string {
	if (entry.scope === "all") {
		return entry.name;
	}

	return `${entry.name} (${scopeLabel(entry.scope)})`;
}

interface RegisteredCommand {
	name: string;
	scope: string;
}

/** One registry per plugin instance: a reload starts clean instead of inheriting the last one's commands. */
const registries = new WeakMap<BrumesPlugin, Map<string, RegisteredCommand>>();

function registryOf(plugin: BrumesPlugin): Map<string, RegisteredCommand> {
	let registry = registries.get(plugin);
	if (!registry) {
		registry = new Map();
		registries.set(plugin, registry);
	}
	return registry;
}

/**
 * One command per callout with an alias to insert, diffed by id against what
 * the previous call registered: a removed entry is unregistered, a renamed
 * or rescoped one is re-registered (its display name is fixed at
 * registration time, unlike the visibility check below), an unchanged one is
 * left alone.
 */
export function syncCalloutCommands(
	plugin: BrumesPlugin,
	callouts: CalloutDefinition[],
): void {
	const registered = registryOf(plugin);
	const current = new Map<string, CalloutDefinition>();

	for (const entry of callouts) {
		if (!entry.aliases[0]) {
			continue;
		}
		current.set(commandId(entry), entry);
	}

	for (const id of Array.from(registered.keys())) {
		if (!current.has(id)) {
			plugin.removeCommand(id);
			registered.delete(id);
		}
	}

	for (const [id, entry] of current) {
		const previous = registered.get(id);
		if (previous?.name === entry.name && previous.scope === entry.scope) {
			continue;
		}

		if (previous) {
			plugin.removeCommand(id);
		}

		registerCalloutCommand(plugin, id);
		registered.set(id, { name: entry.name, scope: entry.scope });
	}
}

/**
 * The insertion itself always reads `plugin.settings.callouts` fresh by id,
 * so an alias or template edited without a name/scope change (which would
 * not otherwise re-register the command) still inserts current data.
 */
function registerCalloutCommand(plugin: BrumesPlugin, id: string): void {
	const entryAt = () => plugin.settings.callouts.find((c) => commandId(c) === id) ?? null;
	const entry = entryAt();
	if (!entry) {
		return;
	}

	plugin.addCommand({
		id,
		name: calloutCommandName(entry),
		editorCheckCallback: (checking: boolean, editor: Editor): boolean | void => {
			const current = entryAt();
			if (!current) {
				return false;
			}

			if (visibleCallouts([current], plugin.settings.mode).length === 0) {
				return false;
			}

			if (checking) {
				return true;
			}

			const alias = current.aliases[0];
			if (!alias) {
				return;
			}

			insertCallout(editor, alias, current.template);
		},
	});
}

/** Called from `onunload`, on the same pattern as the plugin's owned `<style>` element. */
export function clearCalloutCommands(plugin: BrumesPlugin): void {
	const registered = registryOf(plugin);
	for (const id of Array.from(registered.keys())) {
		plugin.removeCommand(id);
	}
	registered.clear();
}
