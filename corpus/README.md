# Le corpus

Des documents qui prouvent. Deux camps les lisent, et ils ne leur demandent pas
la même chose.

| Camp                         | Sur un témoin          | Sur un refus                          |
| ---------------------------- | ---------------------- | ------------------------------------- |
| Le schéma (hors `handbook`)  | ajv l'accepte          | ajv le rejette                        |
| Handbook                     | le bloc le rend entier | le bloc perd le champ fautif et rend le reste |

Le schéma **rejette**, le consommateur **dégrade**. Ce n'est pas une
contradiction, c'est la répartition du travail : un document se tape dans une
note et il est faux la plupart du temps où on le regarde.

## Pourquoi les deux moitiés

> « Sans le témoin, une série de refus ne prouve rien — un schéma qui rejette
> tout les passerait tous. »
>
> — `schema-adrenaline`, `tools/audit-schemas.ts`

Un corpus qui n'aurait que des refus certifierait un schéma cassé. Un corpus qui
n'aurait que des témoins ne mesurerait aucune borne.

## `temoins/`

Un document **complet** par format : tous les champs renseignés, y compris ceux
qui sont à nous et que l'amont ne décrit pas encore — `is_countdown` et `on_max`
pour un Danger, `secrets` pour un défi.

Un témoin sert de référence de rendu : s'il cesse de se rendre entièrement, un
parser a régressé.

## `refus/`

**Un fichier par faute réelle**, nommé par la faute qu'il porte — jamais par un
numéro. Les fautes viennent de ce qui arrive vraiment quand on tape un document :
un champ requis absent, un type erroné, un tableau écrit comme une table, une
valeur hors de l'énumération.

Chaque refus s'ouvre sur une directive que le harnais lit :

```toml
# attend: null
```

ou

```toml
# attend: dégradé
```

- **`null`** — la faute empêche le document d'exister (le nom manque). Le
  lecteur rend `null` et la grammaire terse reprend la main.
- **`dégradé`** — la faute ne coûte que son propre champ. Le document se rend,
  amputé de ce seul champ.

La ligne suivante dit en clair de quoi il s'agit. Un refus se lit sans ouvrir le
harnais.

## Les formats couverts

Le corpus couvre chaque bloc inscrit dans `BRUMES_BLOCKS`. Il comprend notamment
les trois documents Adrenaline publiés : `adrenaline-pj`, `adrenaline-pnj` et
`adrenaline-monstre`. Chacun a son témoin, ses refus pertinents et sa commande
de copie ; aucun total fragile n'est recopié ici.

Le harnais garde la liste des blocs en dette **vide**. Un bloc neuf qui n'y
figure pas et n'a ni témoin ni commande de copie fait échouer
`pnpm assert:corpus` — c'est ainsi que la règle se tient toute seule.

### Tout bloc ne sait pas rendre `null`

`com-theme-card` n'a que des refus **dégradés**. Ce n'est pas un oubli : quand
le lecteur de document renonce, la grammaire terse reprend la main, et celle de
la carte de thème City of Mist lit la deuxième ligne venue comme un titre. Elle
rend donc quelque chose là où les cinq autres grammaires ne trouvent rien.

Le harnais mesure ce que `block.parse` renvoie, pas ce que le seul lecteur de
document aurait renvoyé. Écrire `# attend: null` sur un bloc dont la grammaire
rattrape tout ferait passer une assertion pour un contrôle.

## Lancer

```bash
pnpm assert:corpus
```
