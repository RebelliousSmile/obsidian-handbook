# Prouver les déclarations locales contre les métadonnées publiées, hors du bundle

- Date: 2026-09-20
- Status: Accepted

## Context

Depuis `schema-pbta` v5.5.0, le tarball publie ses métadonnées inter-outils :
`cross-tool-provider.json` nomme les capacités attendues d'un hôte et un glob
`packs/*/pack-contract.json` décrit chaque pack. `.codex/rules/0-cross-repo-contract-flow.md`
demande de piloter les menus de Handbook par les métadonnées publiées, ce qui se
lit d'abord comme « importer la liste amont et supprimer la liste locale ».
Trois listes locales étaient candidates : les capacités PbtA de
`src/features/pbta/coverage.ts`, l'appartenance d'une cible à son pack, et les
cibles projetées. Aucune ne peut être remplacée par un import : `packManifest`
est un glob, qu'un bundle n'énumère pas, et figer six imports nommés
reconstituerait la liste qu'on prétend supprimer.

## Decision

Les métadonnées publiées sont lues par les outils (`tools/pbtaProviderContract.mts`,
depuis le chemin d'installation), jamais importées dans le bundle du plugin.
Handbook continue de déclarer localement ce qu'il supporte — une seule source par
fait, `PORTABLE_GAME_PLUGIN_SUPPORT` pour les capacités, le nom `<pack.id>-playbook`
pour l'appartenance — et `assert:pbta-pack-coverage` prouve ces déclarations
contre le tarball épinglé. La règle amont est donc honorée comme une preuve au
build, pas comme une dépendance d'exécution.

## Alternatives

Importer `capabilities.handbook` dans le runtime ajoute une quatrième source au
lieu d'en retirer une, et couple le bundle à un fichier que le tarball peut
cesser d'exporter. Substituer `pack.id` amont à la déduction par le nom déplace
la convention sans la supprimer : les identifiants du runtime viennent des
manifestes *installés*, pas du producteur. Ne rien prouver laisse une convention
tacite mentir à l'exécution, dans un rapport qu'aucun utilisateur ne peut
contredire.

## Consequences

Une régression de ce que Handbook déclare — capacité disparue de
`capabilities.handbook`, cible projetée qu'aucun pack ne revendique,
appartenance qui cesse de se lire sur le nom — échoue nommément au build. La
tolérance reste asymétrique : entre versions un ajout amont est un constat,
puisque le schéma s'étend avant le travail consommateur ; à l'intérieur d'un
tarball épinglé, codecs, contrats de packs et corpus sont livrés ensemble, donc
un désaccord entre eux est un défaut de cette version et échoue. En contrepartie,
lire les métadonnées depuis `node_modules` lie l'assertion à un `pnpm install`
réussi, et vérifier ces branches par mutation demande de simuler la livraison
complète : un codec, un contrat de pack et un témoin de corpus, pas un fichier
seul. Complète `game-schema-ownership-and-release-order.md`, qui tranche la
propriété et l'ordre de publication, et `game-capabilities-are-scoped-by-pack-id.md`,
qui tranche la portée d'une capacité.
