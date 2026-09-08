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

## Le corpus grandit

Aujourd'hui il couvre **deux blocs** : `litm-challenge` et `com-danger`, les
seuls qui savent lire un document TOML.

La phase 3 du plan `2026_09_08_schema-design-guidelines` porte les quatre autres
— `theme-card`, `com-theme-card`, `litm-journey`, `litm-theme-kit` — et le
corpus les rejoint alors. **Six à la fin.**

Tant que l'écart n'est pas fermé, le harnais tient une liste nommée des blocs en
dette : un bloc qui n'y figure pas et manque à la règle fait échouer
`pnpm assert:corpus`.

## Lancer

```bash
pnpm assert:corpus
```
