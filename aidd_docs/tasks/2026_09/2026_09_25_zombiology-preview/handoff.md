# Zombiology presentation preview — checkpoint

Status: in progress, not ready for adoption on `main` or installation in the user's vault.

The three Handbook renderers now project the PJ, PNJ and monster sections/blocks described by `schema-adrenaline/presentation`. The PJ projection includes the name card, three training columns, full characteristic names with creation/current columns, equipment, stress dice, status frames and fatigue circles. The source TOML note was not changed. The local harness parses and renders all three fenced blocks from `Test Handbook — Adrenaline.md` when given `--vault`.

The provider contract is in the `schema-adrenaline` repository (commit `4296d3f` and its two preceding presentation commits). It has not been released with the new `./presentation` subpath. Handbook's `package.json` and lockfile therefore retain the published archive; do **not** commit a local `pnpm link` override. For local development only, check out both repositories as siblings, build schema-adrenaline, then link it into Handbook. Revert the temporary dependency/lockfile changes before committing.

Validation before handoff: Handbook build, targeted ESLint, Adrenaline document/style assertions (including the real note), contextual block and TOML export assertions passed with the local provider link. The public-pin contract assertion intentionally does not pass while linked locally.

Obsidian rejected two provisional Handbook installations with only a generic plugin failure message. The previously installed plugin, pack manifests and catalogue were restored; the vault's `data.json` and note were not changed. The root cause is being handled by a separate issue. Do not reinstall this draft in the main Zombiology vault until that issue is resolved and the load is verified in an isolated vault. A focused provider import reduced the bundle size, but did **not** fix the load failure.

Next steps: resolve the plugin-load issue in isolation; visually compare the three sheets with the source JPGs; release the provider contract; update Handbook to the published archive and verify a frozen install; only then adopt this branch on `main`.
