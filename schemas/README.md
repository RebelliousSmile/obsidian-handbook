# Installable packs

`catalog.json` declares the schema repositories offered by Handbook on first
launch, in settings, and through the **Install game packs** command. Each entry
installs one repository independently, following its latest published release.
Handbook bundles the catalogue into `main.js`; no catalogue fetch is required.

Only discovery labels and repository references belong here. The installed
schema publishes the games, blocks, assets, variants and presentation metadata.
Adding a game to an existing schema does not require updating this catalogue.

Supervisor's `supervisor/topology.json` describes development and publication,
not the user-facing installation catalogue. The catalogue assertion checks that
its repositories match the providers declared in that topology.
