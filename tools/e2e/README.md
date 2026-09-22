# Obsidian E2E journeys

## requestUrl source installation

`request-url-journey.sh` preserves the regression journey from issue #23. It launches a real Obsidian instance, installs the Mist Engine starter kit, verifies the historical `v1.0.0` tag, then changes `schema-in-the-mist` to `v1.2.0`. It compares each installed manifest, pack, and first declared image with its exact GitHub revision; for `v1.2.0`, it also compares City of Mist’s declared `styles/city-of-mist.css` byte for byte.

The journey temporarily replaces the Handbook plugin and storage directories in the selected vault. It atomically isolates their original contents outside the vault, restores them on every exit through a shell trap, verifies the restored trees, and preserves the backup if verification fails. It refuses to start while Obsidian is already running.

Prerequisites:

- Linux with an Obsidian AppImage;
- `bash`, `curl`, `jq`, and Python 3;
- the Python packages `websocket-client` and `pypdf`;
- built plugin assets in `dist/` (run `pnpm build` first);
- a disposable or backed-up vault where the `obsidian-handbook` community plugin is enabled.

Run:

```bash
HANDBOOK_E2E_ALLOW_MUTATION=1 \
HANDBOOK_E2E_VAULT=/absolute/path/to/test-vault \
HANDBOOK_E2E_OBSIDIAN=/absolute/path/to/Obsidian.AppImage \
pnpm e2e:request-url
```

Optional variables:

- `HANDBOOK_E2E_PLUGIN_DIR`: directory containing `main.js`, `manifest.json`, and `styles.css`; defaults to `dist/`.
- `HANDBOOK_E2E_OUTPUT_DIR`: empty directory for the persistent report and screenshots; defaults to a new directory under `/tmp` and must remain outside the vault.
- `HANDBOOK_E2E_CDP_PORT`: Electron debugging port; defaults to `9223`.
- `HANDBOOK_E2E_OBSIDIAN_LOG`: Obsidian log file; defaults to `$HOME/.config/obsidian/obsidian.log`.

The command writes `REPORT.md`, one screenshot per journey step, downloaded comparison fixtures, and the appended Obsidian log to the output directory.

## Layout regions

`layout-regions-journey.ps1` on Windows and `layout-regions-journey.sh` on Linux
exercise the same committed Markdown fixture and CDP assertions in a temporary
vault. They verify three columns at 1200 px with and without the Adrenaline
editorial theme, three columns in a 750 px window with the Monsterhearts theme,
and the one-column fallback in a narrow pane and at 600 px. The temporary vault
is removed after the run.

The journey also exports the print probe (`fixtures/layout-regions-print-probe.md`)
through Obsidian's own export: it captures the export dialog instance, calls
`print()` on a detached `.print` container and `printToPdf()` with a file path in
the output directory, so no native dialog opens and nothing is written to a vault.
It asserts on the print DOM (one `.handbook-layout-region` directly in
`.markdown-preview-view`, six columns, three grid tracks, one track under 520 px,
the same result under the Adrenaline and Monsterhearts classes) and on the real
PDF: `pypdf` must find the six titles on three distinct abscissas and two
distinct ordinates, while a control note without regions keeps a single one.
The dialog is not reached through `require("obsidian")`, which is unavailable
outside plugins, but through the prototypes of live instances. The DOM and PDF
positions land in `print-dom.json` and `layout-regions-print-*.pdf`.
`-PrintOnly` (PowerShell) or `HANDBOOK_E2E_PRINT_ONLY=1` runs only this part.
Only Obsidian's native export is covered, not third-party export plugins.

Prerequisites:

- Windows with Obsidian installed at `C:\Program Files\Obsidian\Obsidian.exe`;
- Python with the `websocket-client` and `pypdf` packages;
- built plugin assets in `dist/` (`pnpm build`).

Run, with Obsidian closed:

```powershell
pnpm e2e:layout-regions
```

On Linux, set the executable path to an Obsidian AppImage. The screenshots and
Obsidian log remain in the printed output directory:

```bash
HANDBOOK_E2E_OBSIDIAN=/absolute/path/to/Obsidian.AppImage pnpm e2e:layout-regions:linux
```

`HANDBOOK_E2E_CDP_PORT` changes the default port 9232, and
`HANDBOOK_E2E_OUTPUT_DIR` selects a persistent output directory.

## Roller tables

`roller-journey.ps1` is currently a manual Windows diagnostic in a disposable vault. It downloads the
locked Dice Roller 11.4.2 release, verifies its SHA-256 before extraction, then
loads it with Handbook and an explicitly enabled generic Roller setting. CDP
right-clicks each rendered table and verifies that the actual Electron clipboard
contains only a result from that table. It then unloads Dice Roller and proves
the table action leaves both clipboard and source note unchanged.

The lock and authored tables live in `fixtures/`. Screenshots and `REPORT.json`
remain in the printed temporary output directory; the vault and isolated Obsidian
profile are removed on every exit. Build first and run with Obsidian closed:

```powershell
pnpm e2e:roller
```
