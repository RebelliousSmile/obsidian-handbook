# Obsidian E2E journeys

## Production plugin load

`plugin-load-journey.sh` opens a fresh vault and profile in Obsidian 1.13.7,
installs the exact `dist/main.js`, `dist/manifest.json`, and `dist/styles.css`,
then subscribes to CDP exceptions before enabling Handbook. It passes only
when `app.plugins.plugins['obsidian-handbook']` exists. The command leaves
`plugin-load.json`, `obsidian.log`, and `main.js.sha256` in its printed output
directory, including on failure. It removes the temporary vault, profile, and
Obsidian process on exit.

On Linux, build first, then run with an executable Obsidian 1.13.7 AppImage,
`curl`, `sha256sum`, Python 3, and `websocket-client` installed:

```bash
HANDBOOK_E2E_OBSIDIAN=/absolute/path/to/Obsidian.AppImage pnpm e2e:plugin-load
```

`HANDBOOK_E2E_OUTPUT_DIR` selects a persistent diagnostic directory, and
`HANDBOOK_E2E_CDP_PORT` changes the default port 9234. The fixture-only
`HANDBOOK_E2E_FIXTURE=1` switch permits `HANDBOOK_E2E_PLUGIN_DIR` to point at a
controlled plugin; release and candidate proof must omit both variables and
therefore always load `dist/`.

The PbtA `release-train:assert` command calls this smoke itself. Its runner
must provide `HANDBOOK_E2E_OBSIDIAN` pointing to the pinned 1.13.7 AppRun,
`websocket-client`, and an active display (for example, wrap the release-train
command in `xvfb-run -a`). The smoke checks the Obsidian AppImage or extracted
application-bundle digest before launch and fails if the host differs. A
candidate proof without these prerequisites fails before writing passed
evidence. The schema-owned release-train manifest remains unchanged.

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

`roller-journey.ps1` runs in Windows CI and can also be used as a local diagnostic in a disposable vault. It downloads the
locked Dice Roller 11.4.2 release, verifies its SHA-256 before extraction, then
loads it with Handbook and an explicitly enabled generic Roller setting. CDP
right-clicks each rendered table and verifies that the ordinary-table and
`dice:` lookup APIs each produce a valid result. It then unloads Dice Roller
and proves the table action leaves the source note unchanged. Clipboard paths
are covered by the focused Roller assertion because Obsidian isolates plugin
clipboard access from CDP's window context.

The lock and authored tables live in `fixtures/`. Screenshots and `REPORT.json`
remain in the printed temporary output directory; the vault and isolated Obsidian
profile are removed on every exit. Build first and run with Obsidian closed:

```powershell
pnpm e2e:roller
```
