# Voir une retouche de schéma sans release

*(English: [dev-schema.en.md](dev-schema.en.md).)*

Une couleur, une illustration ou un `pack.json` retouchés dans `schema-in-the-mist`, `schema-pbta` ou `schema-adrenaline` se voient dans un coffre Obsidian de test **sans release, sans tag et sans changer l'épingle de Handbook**. Une seule commande, la même pour les trois fournisseurs.

## Le cycle

```text
modifier le dépôt fournisseur  →  voir dans la note témoin  →  valider  →  train de release
```

```bash
pnpm dev:schema --source ../schema-pbta --vault "C:/Users/<vous>/Documents/Perso/RPG/urban-shadows"
```

| Argument | Rôle |
| --- | --- |
| `--source <dépôt>` | checkout d'un dépôt `schema-*` (celui qui porte `handbook.json`) |
| `--vault <coffre>` | coffre de test (ou premier argument positionnel) |
| `--config-dir <dossier>` | dossier de configuration du coffre, `.obsidian` par défaut |
| `--once` | une seule synchronisation, code de sortie 0 (installée) ou 1 (refusée) |

`pnpm dev:schema-pbta` reste : c'est `dev:schema` avec `--source ../schema-pbta`.

La commande installe le dépôt dans le coffre **par le même installateur que le plugin** : mêmes validations, mêmes limites, remplacement du dossier d'un bloc, retrait des assets que le fournisseur ne déclare plus. Puis elle surveille `handbook.json` et tout ce qui est sous `handbook/` (hors `preview/` et `styles/` d'un pack, qui n'appartiennent qu'à l'aperçu HTML). Chaque passage affiche les packs installés (id, version) et la révision.

Un pack invalide (JSON tronqué, asset déclaré mais absent, chemin sortant du pack) est refusé : l'erreur nomme le fichier, **le dernier état valide reste en place**, la surveillance continue.

## Prérequis

- Handbook est installé dans le coffre (la commande refuse sinon, avant toute écriture : une faute de frappe dans `--vault` ne crée rien).
- Le plugin couvre la `minimumHandbookVersion` des packs.
- Pour que le coffre se mette à jour seul : le plugin **Hot Reload** ; la commande pose le marqueur `.hotreload` et touche `main.js`. Sans lui, lancer dans Obsidian la commande **Recharger les sources de schéma installées** (palette de commandes).

## Trois niveaux de preuve

| Niveau | Commande | Prouve |
| --- | --- | --- |
| Boucle locale | `pnpm dev:schema` | ce que fait **un** fournisseur, dans un coffre, tout de suite |
| Vérification des consommateurs | `pnpm supervise preview` | le train entier, ses consommateurs compris, avant le verdict de rendu |
| Publication | le train (`ship`) | la release, après validation |

La boucle locale ne remplace ni la preview du train ni les validations : elle raccourcit seulement le temps de la retouche.

## Limites

- Les feuilles `handbook/<jeu>/styles/*.css` servent à l'aperçu HTML et ne sont pas chargées par Obsidian. Les valeurs consommées sont dans `pack.json` et dans les assets qu'il déclare.
- Pour chercher une couleur, `overrides.json` du plugin reste la voie la plus rapide ; la reporter ensuite dans le fournisseur.
- La révision affichée est celle de `HEAD` du dépôt fournisseur, pas celle de l'arbre de travail : une retouche non commitée change le contenu installé, pas la révision.
- La boucle n'écrit **jamais** `data.json`. La source est enregistrée sous la référence `local` (les réglages affichent `revision <sha7>`) ; une source absente de `data.json` est quand même chargée depuis le disque.

## Revenir à l'état publié

La source installée par la boucle garde la référence `local` jusqu'à ce qu'on la remplace. Au choix :

- **Vérifier les mises à jour** (réglages Handbook) : absent pour une source épinglée sur un tag ;
- **Installer des packs de jeu** (palette de commandes) : réinstalle la version publiée.

Défaire les retouches de test dans le dépôt fournisseur **fichier par fichier** (un dépôt peut porter un autre travail non commité) : jamais `git checkout .` ni `git reset`.

## Preuves

`pnpm assert:dev-schema` rejoue : installation, retrait d'un asset, manifeste invalide, asset absent, chemin hors pack, coffre sans plugin, et la surveillance. Après chaque refus le dossier précédent est comparé octet à octet et `data.json` doit être intact.
