# Codebase Audit: dependencies

`pnpm audit --prod --json` reported 0 vulnerabilities across 24 production dependencies. The lockfile is committed and the three GitHub release tarballs are versioned and integrity-pinned.

- **Date**: 2026-09-22
- **Scope**: `package.json`, `pnpm-lock.yaml`
- **Health**: good
- **Findings**: 0 critical, 0 warning, 0 minor

## Findings

| Sev | Category | Location | Issue | Suggested fix | Effort |
| --- | --- | --- | --- | --- | --- |

## Top actions

1. No dependency remediation identified. Revisit normal dev-dependency updates separately; `pnpm outdated` reports several available updates but no production CVE.

## Coverage

- **Scanned**: dependencies
- **Skipped**: automated licence inventory tool is not configured; licence compatibility was not mechanically verified.
