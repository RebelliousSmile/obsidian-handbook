import { addIcon, EventRef, MarkdownView, Notice, Plugin } from "obsidian";
import { loadTagFeature } from "./features/tags";
import { BrumesSettingTab } from "./settings";
import { BrumesSettings, normalizeSettings } from "./settings/types";
import { log } from "./utils/logger";
import {
	clearBrumesModeClasses,
	setBrumesModeClass,
	setBrumesWorkspaceThemeClass,
} from "./features/modes/domModeClass";
import {
	buildGameStyle,
	GameStyleWriter,
} from "./features/modes/styleElement";
import { resolveGamePack } from "./games/registry";
import {
	GameStyleOverride,
	loadGameStyleOverride,
	mergeGameStyle,
} from "./games/overrides";
import { loadBrumesBlocks } from "./features/blocks/registry";
import { registerBrumesContextMenu } from "./contextMenu";
import {
	LANTERN_ICON,
	LANTERN_VIEW_TYPE,
	LanternView,
} from "./views/LanternView";
import { LANTERN_LOGO_SVG } from "./views/lanternLogo";
import { loadCalloutAliasFeature } from "./features/callouts/aliasSupport";
import { loadThemeCardCommands } from "./features/themeCards/copyAsToml";

interface ApplySettingsOptions {
	refreshEditor?: boolean;
	refreshMarkdown?: boolean;
}

export default class BrumesPlugin extends Plugin {
	settings!: BrumesSettings;
	private contextMenuEventRef: EventRef | null = null;
	private lanternRibbonEl: HTMLElement | null = null;
	private syncCalloutAliases: (() => void) | null = null;
	private readonly gameStyle = new GameStyleWriter();
	private styleOverride: GameStyleOverride = {};

	async onload() {
		await this.loadSettings();

		log.setLevel(this.settings.logLevel);
		addIcon(LANTERN_ICON, LANTERN_LOGO_SVG);
		log.info("Handbook plugin loaded");

		this.registerView(
			LANTERN_VIEW_TYPE,
			(leaf) => new LanternView(leaf, this),
		);

		this.addSettingTab(new BrumesSettingTab(this.app, this));

		loadTagFeature(this);
		loadBrumesBlocks(this);
		loadThemeCardCommands(this);
		this.syncCalloutAliases = loadCalloutAliasFeature(this);

		this.addCommand({
			id: "reload-style-overrides",
			name: "Reload personal overrides",
			callback: () => {
				void this.reloadStyleOverride();
			},
		});

		this.registerEvent(
			this.app.workspace.on("window-open", (win) => {
				this.dressDocument(win.doc);
			}),
		);
		this.registerEvent(
			this.app.workspace.on("window-close", (win) => {
				this.undressDocument(win.doc);
			}),
		);

		this.applySettings();

		// The override file lives in the plugin folder, which the vault does
		// not watch, so it is read once here and on demand afterwards.
		void this.reloadStyleOverride();
	}

	onunload() {
		if (this.contextMenuEventRef) {
			this.app.workspace.offref(this.contextMenuEventRef);
			this.contextMenuEventRef = null;
		}

		this.lanternRibbonEl?.remove();
		this.lanternRibbonEl = null;

		for (const doc of this.collectDocuments()) {
			clearBrumesModeClasses(doc);
		}
		this.gameStyle.removeGameStyle();

		log.info("Handbook plugin unloaded");
	}

	async activateLanternView() {
		if (!this.settings.features.lanternIntegration) {
			new Notice(
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				"Enable Lantern in the Mist integration in Handbook settings first.",
			);
			return;
		}

		const leaf = this.app.workspace.getLeaf(true);

		await leaf.setViewState({
			type: LANTERN_VIEW_TYPE,
			active: true,
		});
		void this.app.workspace.revealLeaf(leaf);
	}

	async saveSettings(options: ApplySettingsOptions = {}) {
		await this.saveData(this.settings);
		this.applySettings(options);
	}

	private applySettings(options: ApplySettingsOptions = {}) {
		log.setLevel(this.settings.logLevel);
		this.applyGameStyle();
		this.refreshLanternIntegration();
		this.refreshContextMenu();
		this.syncCalloutAliases?.();

		if (options.refreshEditor) {
			this.app.workspace.updateOptions();
		}

		if (options.refreshMarkdown) {
			this.refreshMarkdownViews();
		}
	}

	/**
	 * The game is written as one block of custom properties into a style
	 * element the plugin owns, in every open document. Switching games
	 * replaces that block whole, so nothing of the previous one survives.
	 */
	private applyGameStyle() {
		const pack = resolveGamePack(this.settings.mode);

		this.gameStyle.applyGameStyle(
			buildGameStyle(
				pack.id,
				mergeGameStyle(pack.style, this.styleOverride),
				this.settings.features.workspaceTheme,
			),
		);

		for (const doc of this.collectDocuments()) {
			this.dressDocument(doc);
		}
	}

	/** Read the user's own values again and repaint, without a restart. */
	async reloadStyleOverride() {
		this.styleOverride = await loadGameStyleOverride(this);
		this.applyGameStyle();
	}

	private dressDocument(doc: Document) {
		setBrumesModeClass(this.settings.mode, doc);
		setBrumesWorkspaceThemeClass(
			this.settings.features.workspaceTheme,
			doc,
		);
		this.gameStyle.addDocument(doc);
	}

	private undressDocument(doc: Document) {
		clearBrumesModeClasses(doc);
		this.gameStyle.forgetDocument(doc);
	}

	/** The main window, plus one document per detached window in use. */
	private collectDocuments(): Document[] {
		const documents: Document[] = [this.app.workspace.rootSplit.doc];

		this.app.workspace.iterateAllLeaves((leaf) => {
			const doc = leaf.getContainer().doc;
			if (documents.indexOf(doc) === -1) {
				documents.push(doc);
			}
		});

		return documents;
	}

	private refreshContextMenu() {
		if (this.contextMenuEventRef) {
			this.app.workspace.offref(this.contextMenuEventRef);
		}

		this.contextMenuEventRef = registerBrumesContextMenu(this);
	}

	private refreshLanternIntegration() {
		if (this.settings.features.lanternIntegration) {
			if (!this.lanternRibbonEl) {
				this.lanternRibbonEl = this.addRibbonIcon(
					LANTERN_ICON,
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					"Lantern in the Mist",
					() => {
						void this.activateLanternView();
					},
				);
			}
			return;
		}

		this.lanternRibbonEl?.remove();
		this.lanternRibbonEl = null;
		this.app.workspace.detachLeavesOfType(LANTERN_VIEW_TYPE);
	}

	private refreshMarkdownViews() {
		for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
			const view = leaf.view;
			if (view instanceof MarkdownView) {
				view.previewMode.rerender(true);
			}
		}
	}

	private async loadSettings() {
		const data: unknown = await this.loadData();
		this.settings = normalizeSettings(
			isSettingsData(data) ? data : undefined,
		);
	}
}

function isSettingsData(
	value: unknown,
): value is Partial<BrumesSettings> | null {
	return value === null || typeof value === "object";
}
