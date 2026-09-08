# Issues à ouvrir hors `handbook`

> **Les sept issues sont ouvertes** (2026-09-08), sur accord explicite : ouvrir
> une issue est une action sortante. Ce fichier reste le texte de référence ;
> les numéros sont dans le récapitulatif.
>
> Le plan `2026_09_08_schema-design-guidelines` n'écrit que dans `handbook`.
> Tout ce qui demande une intervention ailleurs est ici.

## `schema-in-the-mist`

### Extraire `appearance/game-pack.schema.json` vers son propre dépôt

Le schéma d'apparence ne partage **aucun champ** avec les schémas de contenu
(`com-danger`, `challenge`, `theme-card`) — `meta` en est volontairement absent.
Il sert désormais des jeux qui ne sont pas de Son of Oak, donc il n'a plus sa
place dans un dépôt nommé d'après une gamme.

À prévoir dans le déplacement :

- un **chemin de lecture de l'ancien emplacement** : un consommateur qui pointe
  encore vers `schema-in-the-mist/appearance/game-pack.schema.json` ne doit pas
  casser du jour au lendemain ;
- le nouveau dépôt reprend la chaîne commune aux trois dépôts de schéma :
  source Zod (`src/zod/`) → JSON Schema généré (`tools/gen-schemas.ts`) →
  validation ajv (`tools/validate-examples.ts`).

Attention à la collision de noms : `game-definition` (pbta) décrit la
**mécanique**, `game-pack` (mist) décrit l'**apparence**. Ce sont deux choses
sans rapport ; le nouveau dépôt est l'occasion de lever l'ambiguïté.

### Étendre `game-pack` au vocabulaire de zones et aux polarités déclarées

Handbook lit déjà les zones et les polarités avant que le schéma ne les décrive :
`fromSchema.ts` ignore un champ inconnu avec un avertissement unique. **L'usage
précède la publication.** Cette issue rattrape le schéma sur l'usage, elle ne
débloque rien.

Deux ajouts :

- **zones** : une forme est une liste ordonnée de zones ; une zone porte un nom
  et un rôle d'image optionnel. Jamais de CSS sérialisé — un consommateur qui
  n'est pas Handbook doit pouvoir dessiner.
- **polarités** : un pack déclare celles qu'il supporte. Ni dérivation ni
  invention ; pas d'attribut de polarité par gabarit.

À faire dans le dépôt qui héberge `game-pack` au moment de l'ouverture (voir
l'issue d'extraction ci-dessus).

### Publier les formes de `journey` et de `theme kit`

`litm-journey` et `litm-theme-kit` n'ont **aucune forme en amont**. La règle de
zéro exemption (`aidd_docs/guidelines/schema-design.md`) dit qu'un format sans
amont invente sa forme au lieu d'être dispensé.

Handbook écrira ces formes en phase 3 du plan. Cette issue les remonte au dépôt
de schéma pour qu'un autre consommateur puisse les lire.

## `schema-adrenaline`

### Généraliser le corpus refus / témoins

Le corpus doit couvrir les trois dépôts de schéma avec la même structure :
`corpus/refus/` (documents qui doivent être rejetés) et `corpus/temoins/`
(documents qui doivent passer). Les deux moitiés sont nécessaires — sans le
témoin, une série de refus ne prouve rien.

Le même corpus alimente les deux assertions : le schéma rejette, le consommateur
dégrade.

## `schema-pbta`

### Porter `audit-schemas.ts` depuis `schema-adrenaline`

`tools/audit-schemas.ts` n'existe que dans `schema-adrenaline` : cinq contrôles
bloquants par schéma, puis les refus et les témoins. Les trois dépôts partagent
déjà les mêmes devDeps et les mêmes scripts `gen` / `validate` / `toml:one` ;
il n'y a pas d'obstacle culturel au portage.

Ouvrir la même issue sur `schema-in-the-mist`.

### Porter `validate:refs` vers les deux autres dépôts

Symétrique de la précédente : `validate:refs` n'existe que dans `schema-pbta`.

Ouvrir la même issue sur `schema-in-the-mist` et `schema-adrenaline`.

## `lantern`

### Lire les blocs que Handbook sait désormais copier

Au terme de la phase 3, les six blocs exportent un document TOML conforme à leur
schéma. Lantern doit pouvoir les recevoir par copier-coller.

Formats concernés : `theme-card`, `litm-challenge`, `litm-journey`,
`litm-theme-kit`, `com-theme-card`, `com-danger`.

## Le futur dépôt d'apparence

Il n'existe pas encore ; il naît de l'issue d'extraction ci-dessus. Une fois
ouvert, y déplacer :

- l'issue « étendre `game-pack` au vocabulaire de zones et aux polarités » ;
- le corpus refus / témoins propre à l'apparence ;
- `audit-schemas.ts` et `validate:refs`, au même titre que les trois autres.

## Récapitulatif

| # | Dépôt cible          | Issue | Titre                                                        |
| - | -------------------- | ----- | ------------------------------------------------------------ |
| 1 | `schema-in-the-mist` | [#4](https://github.com/RebelliousSmile/schema-in-the-mist/issues/4) | Extraire `appearance/game-pack.schema.json` vers son propre dépôt |
| 2 | `schema-in-the-mist` | [#5](https://github.com/RebelliousSmile/schema-in-the-mist/issues/5) | Étendre `game-pack` aux zones nommées et aux polarités déclarées |
| 3 | `schema-in-the-mist` | [#6](https://github.com/RebelliousSmile/schema-in-the-mist/issues/6) | Publier les formes de `journey` et de `theme kit`            |
| 4 | `schema-adrenaline`  | [#1](https://github.com/RebelliousSmile/schema-adrenaline/issues/1) | Généraliser le corpus refus / témoins aux trois dépôts       |
| 5 | `schema-pbta`        | [#1](https://github.com/RebelliousSmile/schema-pbta/issues/1) | Porter `audit-schemas.ts` depuis `schema-adrenaline`         |
| 6 | `schema-in-the-mist` | [#7](https://github.com/RebelliousSmile/schema-in-the-mist/issues/7) | Porter `validate:refs` depuis `schema-pbta`                  |
| 7 | `lantern`            | [#1](https://github.com/RebelliousSmile/lantern/issues/1) | Lire les six blocs exportés par Handbook                     |

Deux portages n'ont qu'une moitié d'issue. Les lignes 5 et 6 visaient chacune
**deux** dépôts ; sept issues n'en couvrent qu'un chacune. Les jumelles restent
à ouvrir, et les corps le disent :

- `audit-schemas.ts` sur `schema-in-the-mist` ;
- `validate:refs` sur `schema-adrenaline`.

Cible retenue pour la ligne 7 : **`lantern`**, pas `lantern-in-the-mist`. Les
deux dépôts existent ; `lantern` est le multi-système dérivé du premier, et le
seul des deux dont les issues sont actives.
