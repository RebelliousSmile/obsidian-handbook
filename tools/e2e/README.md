# Obsidian E2E journeys

## requestUrl source installation

`request-url-journey.sh` preserves the regression journey from issue #23. It launches a real Obsidian instance, installs the Mist Engine starter kit, verifies the historical `v1.0.0` tag, then changes `schema-in-the-mist` to `v1.2.0`. It compares each installed manifest, pack, and first declared image with its exact GitHub revision; for `v1.2.0`, it also compares City of Mist’s declared `styles/city-of-mist.css` byte for byte.

The journey temporarily replaces the Handbook plugin and storage directories in the selected vault. It atomically isolates their original contents outside the vault, restores them on every exit through a shell trap, verifies the restored trees, and preserves the backup if verification fails. It refuses to start while Obsidian is already running.

Prerequisites:

- Linux with an Obsidian AppImage;
- `bash`, `curl`, `jq`, and Python 3;
- the Python package `websocket-client`;
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

`layout-regions-journey.ps1` exercises the note-local column feature on
Windows. It refuses to run while Obsidian is already open, creates a new vault
under the system temporary directory, copies the compiled Handbook assets into
that vault, and opens its probe through the Obsidian URI. It verifies a
three-column region at 1200 px and the one-column responsive fallback at 600
px, then stops only the process tree it created and removes the temporary
vault.

Prerequisites:

- Windows with Obsidian installed at `C:\Program Files\Obsidian\Obsidian.exe`;
- Python with the `websocket-client` package;
- built plugin assets in `dist/` (`pnpm build`).

Run, with Obsidian closed:

```powershell
pnpm e2e:layout-regions
```
