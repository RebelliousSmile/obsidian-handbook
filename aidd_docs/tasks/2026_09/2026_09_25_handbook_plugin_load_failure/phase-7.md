---
status: pending
---

# Instruction: Prepare one coherent Handbook patch

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
.
├── .github/
│   └── workflows/
│       └── release.yml ✏️ records and uploads hashes of the host-proved dist before publishing those same files
├── CHANGELOG.md ✏️ documents the activation correction, host gate, and canonical provider convergence under the patch version
├── manifest.json ✏️ declares the corrective patch version delivered to Obsidian
├── package.json ✏️ declares the same patch version on the final provider graph
├── versions.json ✏️ maps the patch to its minimum supported Obsidian version
└── tools/
    ├── assert-host-artifact-gates.mjs ✏️ requires provenance capture after host proof and before publication
    └── write-release-artifact-provenance.mjs ✅ writes version and SHA-256 for the exact three release assets
```

## User Journey

```mermaid
flowchart TD
  A[Final-pinned graph passes every gate] --> B[Choose the next patch version]
  B --> C[Update package, manifest, versions map, and changelog]
  C --> D[Build and load the exact release assets]
  D --> E[Hash the same three host-proved files]
  E --> F[Validate intended tag identity]
  F --> G[Commit one tag-ready release source]
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    system: start from the clean phase-6 final dependency commit => one fully converged release graph is ready for a patch bump: 5: system
  section Happy path
    cli: bump through the repository version path and run release checks plus real host load => all four version sources and the intended tag agree and the exact dist activates: 5: cli
  section Edge case - identity drift
    cli: supply a tag, changelog, package, manifest, or versions-map value that differs => validation fails before a tag or release exists: 1: cli
  section Edge case - artifact substitution
    cli: move omit or replace a release asset between host proof provenance and publication => the structural release assertion rejects the workflow ordering: 1: cli
  section Teardown
    system: inspect the phase commit and worktree => the tag-ready source is immutable and no generated or temporary artifact is tracked: 5: system
```

## Tasks to do

### `1)` Create the patch identity

> Align every source Obsidian, BRAT, GitHub, and maintainers use to identify the release.

1. Select the next patch only after phase 6 is committed and use the repository version workflow to update package, manifest, and versions map together.
2. Add the newest changelog entry describing the unloadable-bundle fix, mandatory host-artifact proof, and final provider pins.
3. Verify the declared minimum app version remains consistent with the tested 1.13.7 host.

### `2)` Produce a tag-ready commit

> Validate locally before any public tag can trigger or identify a release.

1. Run a frozen install, full core check, final/coordinated pin assertions, production build, and focused Obsidian load.
2. Add a deterministic provenance writer for `dist/main.js`, `dist/manifest.json`, and `dist/styles.css`; require the release workflow to run it after the host proof, upload `release-artifact-provenance.json`, and publish those same paths without rebuilding.
3. Extend the structural release assertion to reject missing provenance, provenance before host proof, a rebuild or asset substitution afterward, and publication before provenance upload.
4. Run release-version validation both without a tag and with the intended `v<patch>` value.
5. Mark the phase done and commit the versioned sources; leave the tree clean for the public release phase.

## Test acceptance criteria

| Task | Acceptance criteria |
| --- | --- |
| 1 | `package.json`, `manifest.json`, `versions.json`, and the newest changelog entry identify one patch and minimum app version. |
| 2 | The tag-ready commit passes frozen installation, full checks, canonical/coordinated pin validation, production build, and Obsidian 1.13.7 activation. |
| 2 | The release workflow uploads `release-artifact-provenance.json` containing the patch version and SHA-256 of exactly `main.js`, `manifest.json`, and `styles.css`, captured after host activation and before publishing those unchanged paths. |
| 2 | Structural assertions reject a missing or reordered provenance step, any rebuild or release-asset substitution after the host proof, and publication before provenance upload. |
| 2 | `RELEASE_TAG=v<patch>` agrees with the shipped manifest before the public tag is created. |
