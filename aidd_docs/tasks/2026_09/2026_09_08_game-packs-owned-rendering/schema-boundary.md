---
phase: 5
---

# La frontière entre le schéma de contenu et le schéma d'apparence

## Deux publics, deux contrats

`schema-in-the-mist` décrit jusqu'ici **ce qui se joue** : un Danger, un Défi,
un Voyage, un Theme Kit. Ces documents sont écrits par un narrateur, lus par un
bloc fencé, et voyagent d'un outil à l'autre — Handbook n'est qu'un lecteur
parmi d'autres.

Le schéma d'apparence décrit **comment un jeu se dessine** : son identité, les
variables CSS qu'il pose, ses variantes clair/sombre, et les chemins de ses
illustrations dans le coffre. Il est écrit par qui habille un jeu, lu par le
socle de rendu, et n'a aucun sens hors d'un moteur qui sait poser du CSS.

Un consommateur du premier n'a aucun usage du second : un convertisseur TOML →
JSON, un validateur d'exemples, un site qui liste des profils de Danger ne
posent jamais de variable CSS. L'inverse est vrai aussi — le socle n'a jamais
besoin de savoir ce qu'est une Faiblesse pour écrire `--color-red`.

## Ce que le schéma d'apparence décrit

| Champ | Rôle |
| --- | --- |
| `id` | l'identifiant du jeu, aussi le suffixe de classe `brumes--<id>` |
| `label` | le nom affiché dans les réglages |
| `style.base.note` · `style.base.workspace` | les jetons posés quel que soit le thème |
| `style.light.*` · `style.dark.*` | les mêmes, par variante de thème |
| `assets.root` | le dossier des fichiers du jeu, dans le coffre |
| `assets.images` | un rôle d'illustration → un fichier sous ce dossier |
| `assets.fonts` | une famille nommée par les jetons → le fichier qui porte la fonte |

Rien d'autre. Le pack ne porte ni CSS, ni sélecteur, ni règle : uniquement des
paires nom de propriété personnalisée → valeur, que le socle recopie telles
quelles dans le bloc de style qu'il possède.

## Ce que le schéma d'apparence ne décrit pas

- **Rien de jouable.** Aucun tag, aucun thème narratif, aucune piste, aucune
  Faiblesse, aucune Limite. Ce vocabulaire appartient aux schémas de contenu et
  n'apparaît pas ici, pas même en commentaire de champ.
- **Aucune structure de bloc.** Le gabarit d'une carte de thème reste du code
  (`BRUMES_BLOCKS`), paramétré par les jetons du pack. Le schéma ne dit jamais
  quel bloc existe ni ce qu'il rend.
- **Aucune attribution.** Les schémas de contenu portent tous un `meta`
  (`publication_type`, `source`, `authors`, `page`), parce qu'un profil publié
  se cite. Un pack d'apparence n'est pas du contenu publié : il habille un jeu
  déjà nommé par `label`, et les droits de ce jeu ne se déclarent pas dans un
  fichier de thème. Le champ est donc **volontairement absent**, pour qu'aucun
  nom ne vive dans les deux schémas à la fois.

## Vérification du recouvrement

Champs racine des onze schémas de contenu publiés, relevés dans
`schemas/*/*.schema.json` le 2026-09-08 :
`abandon`, `benefits`, `category`, `choices`, `consequences`, `custom_moves`,
`decay`, `description`, `feature_tags`, `general_consequences`, `hard_moves`,
`improve`, `improvements`, `level`, `limits`, `loadout`, `meta`, `mights`,
`milestone`, `name`, `power_tags`, `quest`, `rating`, `roles`, `scale`,
`soft_moves`, `special_features`, `specials`, `spectrums`, `tags`,
`tags_and_statuses`, `theme_kits`, `theme_type`, `threats`, `title_tag`,
`type`, `upgrade`, `vignettes`, `weakness_tag`, `weakness_tags`.

Champs racine du schéma d'apparence : `id`, `label`, `style`, `assets`.

**Intersection : vide.** Aucun nom n'est partagé, à aucun niveau de racine, et
le seul sous-schéma commun envisageable — `meta` — a été écarté ci-dessus.

## Hébergement (tâche 2)

Décision consignée le 2026-09-08 :

1. Le schéma d'apparence est écrit comme **schéma frère** dans
   `schema-in-the-mist`, sous son propre espace `src/zod/appearance/` et
   `schemas/appearance/`, avec sa propre version. Il n'entre dans aucun dossier
   de jeu : il est transverse aux trois.
2. Il est publié d'abord dans **le dépôt qui nous appartient**
   (`origin` = `RebelliousSmile/schema-in-the-mist`). Le proposer à l'amont
   (`4rtamis/schema-in-the-mist`) est une conversation humaine, qui vient
   après ; un refus ne coûte que le point d'origine, pas le format.
3. **Le plugin ne dépend d'aucun dépôt distant à l'exécution.** `fromSchema.ts`
   lit un document conforme et rien de plus : ni fetch, ni import de paquet, ni
   fichier de schéma embarqué. Le contrat est respecté par la forme des données,
   pas par une dépendance. C'est ce qui rend la tâche 2 non bloquante pour le
   code : il n'y a rien à débloquer avant d'écrire le lecteur.

> À ratifier par l'utilisateur : l'accord de l'amont est un pas humain, non
> réalisable par l'assistant. Le code écrit en phase 5 ne l'attend pas.

## Ce que la phase fait, et ce qu'elle ne fait pas

Faite :

- `src/games/fromSchema.ts` lit un document de pack et rend un `GamePack`, et
  l'écrit en sens inverse (`toGamePackDocument`) — c'est ce second sens qui a
  produit les trois exemples publiés.
- `src/games/types.ts` déclare que sa forme **est** la forme publiée, et que le
  format est gelé : aucun champ renommé ou retiré sans chemin de lecture de
  l'ancienne forme.
- `src/games/overrides.ts` passe désormais par `readPackTokens`, le lecteur du
  document : le fichier `overrides.json` qu'un utilisateur écrit à la main est
  un pack dont presque tout est omis, il n'a plus de lecteur à lui. C'est le
  chemin par lequel le lecteur de documents tourne réellement à l'exécution.
- Les trois packs du code, exportés en documents, **valident contre le schéma
  publié** sous ajv (`npm run validate` dans le dépôt frère) et sont versés
  dans `examples/appearance/game-pack/`.

Pas faite, et volontairement :

- **Le registre reste statique.** Charger des packs écrits dans le coffre
  demanderait de rendre `GAME_PACKS` dynamique, ce que `domModeClass.ts` lit une
  fois au chargement du module et ce que l'onglet de réglages et
  `settings/types.ts` consultent chacun de leur côté. Le plan ne le demande pas
  — sa projection ne touche ni le registre ni le plugin — et le faire ici
  risquerait le rendu obtenu aux phases 1 à 4 pour une fonctionnalité qui n'est
  pas celle de cette phase. Le contrat est gelé et prouvé ; brancher un dossier
  `packs/` du coffre dessus est un pas suivant, sans rien à rouvrir.
