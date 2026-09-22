# Codebase Audit: security

Input boundaries are generally guarded: repository manifests, pack manifests, relative paths and pack CSS are validated before installation or use. No hard-coded secret, evaluator, shell execution from runtime input, or unsafe HTML sink was found in `src/`.

- **Date**: 2026-09-22
- **Scope**: `src/`
- **Health**: good
- **Findings**: 0 critical, 1 warning, 0 minor

## Findings

| Sev | Category | Location | Issue | Suggested fix | Effort |
| --- | --- | --- | --- | --- | --- |
| 🟡 | security | `src/games/sourceInstaller.ts:120` | `readBinary` completes before `assetBytes` is compared with `MAX_ASSET_BYTES`; a remote declared asset can consume excessive memory before the installer rejects it. | Apply a size check before allocation from a response header, or expose a streamed/capped reader from the source adapter. | M |

## Top actions

1. Bound binary assets before allocation and prove it with an oversized remote fixture (row 1; `aidd-dev:08-debug`).

## Coverage

- **Scanned**: security
- **Skipped**: dynamic penetration testing; no live vault/runtime endpoint was supplied.
