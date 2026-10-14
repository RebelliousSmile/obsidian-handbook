# See a schema change without a release

*(Français : [dev-schema.fr.md](dev-schema.fr.md).)*

A colour, an illustration or a `pack.json` edited in `schema-in-the-mist`, `schema-pbta` or `schema-adrenaline` shows up in a test Obsidian vault **with no release, no tag and no change to Handbook's pin**. One command, the same for the three providers.

## The cycle

```text
edit the provider repository  →  see it in the witness note  →  validate  →  release train
```

```bash
pnpm dev:schema --source ../schema-pbta --vault "C:/Users/<you>/Documents/Perso/RPG/urban-shadows"
```

| Argument | Role |
| --- | --- |
| `--source <repository>` | checkout of a `schema-*` repository (the one that carries `handbook.json`) |
| `--vault <vault>` | test vault (or first positional argument) |
| `--config-dir <folder>` | the vault's configuration folder, `.obsidian` by default |
| `--once` | a single synchronisation, exit code 0 (installed) or 1 (refused) |

`pnpm dev:schema-pbta` remains: it is `dev:schema` with `--source ../schema-pbta`.

The command installs the repository into the vault **through the plugin's own installer**: same validations, same limits, the source folder replaced as one block, assets the provider no longer declares removed. It then watches `handbook.json` and everything under `handbook/` (except a pack's `preview/` and `styles/`, which only belong to the HTML preview). Each pass prints the installed packs (id, version) and the revision.

An invalid pack (truncated JSON, a declared asset that is missing, a path leaving the pack) is refused: the error names the file, **the last valid state stays in place**, and watching continues.

## Prerequisites

- Handbook is installed in the vault (the command refuses otherwise, before any write: a typo in `--vault` creates nothing).
- The plugin covers the packs' `minimumHandbookVersion`.
- For the vault to update by itself: the **Hot Reload** plugin; the command drops the `.hotreload` marker and touches `main.js`. Without it, run **Reload installed schema sources** in Obsidian (command palette).

## Three levels of proof

| Level | Command | Proves |
| --- | --- | --- |
| Local loop | `pnpm dev:schema` | what **one** provider does, in one vault, right now |
| Consumer check | `pnpm supervise preview` | the whole train, consumers included, before the rendering verdict |
| Publication | the train (`ship`) | the release, once validated |

The local loop replaces neither the train's preview nor its validations: it only shortens the time of an edit.

## Limits

- The `handbook/<game>/styles/*.css` sheets feed the HTML preview and are not loaded by Obsidian. What is consumed is in `pack.json` and the assets it declares.
- To search for a colour, the plugin's `overrides.json` remains the fastest way; carry it into the provider afterwards.
- The revision shown is the provider repository's `HEAD`, not the working tree: an uncommitted edit changes the installed content, not the revision.
- The loop **never** writes `data.json`. The source is recorded under the `local` reference (settings show `revision <sha7>`); a source missing from `data.json` is still loaded from disk.

## Going back to the published state

The source installed by the loop keeps the `local` reference until it is replaced. Either:

- **Check for update** (Handbook settings): absent for a source pinned to a tag;
- **Install game packs** (command palette): reinstalls the published version.

Undo test edits in the provider repository **file by file** (a repository may carry other uncommitted work): never `git checkout .` nor `git reset`.

## Proofs

`pnpm assert:dev-schema` replays: installation, an asset removed, an invalid manifest, a missing asset, a path leaving the pack, a vault without the plugin, and the watcher. After each refusal the previous folder is compared byte for byte and `data.json` must be intact.
