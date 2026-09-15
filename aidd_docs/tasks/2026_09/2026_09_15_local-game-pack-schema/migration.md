# Migration du contrat GamePack

## But

`schemas/appearance/game-pack.schema.json` dans Handbook est la source de
vérité du format d’apparence. Les dépôts de jeux ne publient que leurs
manifestes `pack.json` et les ressources qu’ils déclarent.

## Ordre de migration

1. Publier Handbook avec le schéma local, `pnpm assert:game-pack-contract` et
   la validation locale des manifests installés.
2. Vérifier l’installation d’une source existante et d’une révision historique :
   leurs `pack.json` doivent rester lisibles sans que Handbook télécharge un
   schéma d’apparence.
3. Mettre à jour les liens de contribution qui désignaient le schéma externe.
4. Dans une tâche distincte du dépôt `schema-in-the-mist`, déprécier puis
   retirer son duplicat du schéma d’apparence. Ne pas modifier les tags ni les
   releases immuables : Handbook conserve la compatibilité de lecture de leur
   forme.

## Limite

Cette migration ne retire pas les sources de jeu externes. Elles restent le
canal versionné de distribution de packs et d’assets ; seule la propriété du
contrat est rapatriée dans Handbook.
