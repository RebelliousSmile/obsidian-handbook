# Cross-repository document contract flow

## Ownership

- Version document contracts in schema packages.
- Version presentation semantics beside contracts.
- Keep user data separate from metadata.
- Publish blocks, regions, and section order.
- Publish tokens, assets, variants, and styles.
- Keep game semantics outside consumers.
- Keep runtime adapters consumer-owned.

## Delivery

- Extend schema before consumer work.
- Publish an immutable versioned candidate before staged consumer adoption. Run the provider release train against immutable Handbook and Lantern commits; promote the byte-identical final archive only after both proofs pass.
- Adopt final schema archives before publishing a Handbook release. A candidate pin is valid for development checks while its archive URL and SRI match the published bytes.
- Treat schema-owned orchestration manifests as exact inputs; derive consumer-local evidence paths instead of adding consumer fields.
- Pin versioned release archives in the lockfile to their canonical release URL and published SRI; verify the pin with a frozen install, never an expiring storage redirect. The final pin must use the final release tag and asset name, not a candidate asset.
- Drive Handbook menus from published metadata.
- Drive Lantern forms from published metadata.
- Reject consumer-local semantic fallbacks.
- Verify corpus and cross-tool round trips.
