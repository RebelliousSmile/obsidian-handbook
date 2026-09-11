# Développer et diagnostiquer les thèmes dans Obsidian

## But

Utiliser un coffre Obsidian de test comme banc visuel pendant que Handbook est
compilé depuis ce dépôt. Les fichiers chargés par Obsidian servent à inspecter
le résultat, mais les corrections restent dans leurs sources canoniques.

## Flux de travail

```text
src/**/*.ts + src/styles/**/*.scss
                ↓ npm run dev
dist/main.js + dist/styles.css + dist/manifest.json
                ↓ jonction de répertoire
coffre-test/.obsidian/plugins/obsidian-handbook
                ↓ rechargement
Obsidian + outils de développement
```

1. Préparer un coffre réservé aux essais afin de ne pas perturber un coffre
   réel.
2. Depuis la racine de Handbook, installer une fois les dépendances puis lancer
   la compilation continue :

   ```powershell
   npm install
   npm run dev
   ```

3. Si Handbook est déjà installé dans le coffre par BRAT, déplacer cette copie
   hors de `.obsidian/plugins` avant de créer la jonction. Deux copies portant
   le même identifiant de plugin ne doivent pas coexister.
4. Relier le dossier `dist` du dépôt au dossier du plugin dans le coffre :

   ```powershell
   $vault = "C:\chemin\vers\le-coffre-test"
   $plugins = Join-Path $vault ".obsidian\plugins"

   New-Item -ItemType Directory -Force -Path $plugins | Out-Null
   New-Item -ItemType Junction `
     -Path (Join-Path $plugins "obsidian-handbook") `
     -Target (Resolve-Path ".\dist").Path
   ```

5. Activer Handbook dans les modules complémentaires du coffre. Après une
   modification SCSS, `npm run dev` reconstruit `dist/styles.css`.
6. Recharger Obsidian avec `Ctrl+R`. Pour une boucle automatique, le plugin de
   développement `pjeby/hot-reload` peut surveiller la sortie lorsque le
   marqueur suivant existe :

   ```powershell
   New-Item -ItemType File -Force ".\dist\.hotreload"
   ```

## Diagnostiquer un défaut visuel

1. Reproduire le défaut avec le jeu, la variante, le mode clair ou sombre et la
   vue Markdown exacts. Pour Drowned Lake, vérifier notamment la présence des
   classes `brumes--monsterhearts` et `brumes--variant-drowned-lake`.
2. Ouvrir les outils de développement d'Obsidian (`Ctrl+Shift+I`), sélectionner
   l'élément fautif et examiner les règles appliquées, les règles écrasées et la
   valeur calculée de chaque propriété ou variable CSS.
3. Comparer ce résultat aux sources. Les styles PbtA communs vivent dans
   `src/styles/pbta/_page.scss`; les règles propres aux modes et à Drowned Lake
   vivent dans `src/styles/pbta/index.scss`.
4. Déterminer le propriétaire réel de la valeur avant de la corriger :

   - une règle structurelle ou un sélecteur Handbook se corrige dans
     `src/styles` ;
   - une variable issue d'un pack de jeu se corrige dans le dépôt canonique du
     schéma, pas dans sa copie installée sous `.obsidian/handbook` ;
   - une règle du thème Obsidian actif, par exemple Border, s'inspecte pour
     comprendre la cascade mais ne se modifie que si ce thème est bien la cible
     du travail.

5. Ajouter une assertion de non-régression au niveau le plus proche. Pour les
   thèmes PbtA, le point d'entrée existant est `tools/assert-pbta-theme.mjs`.
6. Vérifier la correction avec l'assertion ciblée, puis avec la suite complète :

   ```powershell
   npm run assert:pbta-theme
   npm run check
   ```

## Règles à retenir

- Ne jamais corriger directement `dist/styles.css`, `dist/main.js` ni les
  fichiers compilés sous `.obsidian/plugins/obsidian-handbook` : ils seront
  écrasés par la prochaine compilation ou mise à jour.
- Les fichiers compilés et les fichiers d'un coffre servent de témoins pour
  confirmer ce qu'Obsidian charge réellement.
- Toujours identifier si le contraste fautif vient d'une valeur absente, d'une
  variable sombre héritée, d'un sélecteur trop faible ou d'une règle du thème
  Obsidian avant d'ajouter une surcharge.
- Tester au minimum les modes clair et sombre ainsi que les vues édition,
  lecture, tableaux et contenu des callouts lorsqu'une couleur de texte change.

## Développer `schema-pbta` dans Obsidian

Les feuilles `handbook/<jeu>/styles/*.css` de `schema-pbta` servent aux previews
HTML et ne sont pas installées dans Obsidian. Les valeurs réellement consommées
par Handbook sont dans `handbook/<jeu>/pack.json`, accompagnées des assets que
ce manifeste déclare.

Après avoir installé `RebelliousSmile/schema-pbta` une première fois dans le
coffre, installer puis activer le plugin Obsidian `hot-reload`. Lancer ensuite
depuis la racine de Handbook :

```powershell
cd C:\Users\fxgui\Documents\Code\Perso\handbook
npm run dev:schema-pbta -- "C:\Users\fxgui\Documents\Perso\RPG\monsterhearts"
```

Le watcher copie chaque `pack.json` et ses assets dans la source locale du
coffre, crée le marqueur `.hotreload` et demande le rechargement de Handbook. Un
JSON momentanément invalide pendant une sauvegarde n'écrase pas la dernière
version valide. Le bouton **Reload installed sources** des réglages Handbook
reste la solution manuelle de repli.

Sous la version de npm utilisée sur Windows, le chemin du coffre doit rester un
argument positionnel. Ne pas écrire `--vault` : npm intercepte cette option et
ne la transmet pas au script. La synchronisation validée affiche :

```text
Synced 5 packs and requested Handbook reload.
Watching C:\Users\fxgui\Documents\Code\Perso\schema-pbta for installable Handbook pack changes...
```

Garder ce terminal ouvert. Pour tester la boucle dans Obsidian :

1. sélectionner **Monsterhearts** puis la variante **Drowned Lake** dans les
   réglages Handbook ;
2. modifier une variable très visible dans
   `schema-pbta/handbook/monsterhearts/pack.json`, par exemple temporairement
   `--background-primary` ou `--text-normal` ;
3. sauvegarder le JSON ;
4. vérifier qu'une nouvelle ligne `Synced 5 packs...` apparaît et que Handbook
   est rechargé ;
5. remettre la valeur finale souhaitée, puis lancer les validations du dépôt
   `schema-pbta`.

Il n'existe pas d'URL Web pour contrôler le rendu réellement injecté dans
Obsidian : le témoin est une note ouverte dans le coffre `monsterhearts`. Les
outils de développement d'Obsidian (`Ctrl+Shift+I`) permettent d'inspecter les
variables calculées.

La preview HTML constitue une boucle séparée. Elle est accessible directement à
l'adresse suivante, mais elle consomme les fichiers `styles/*.css` et ne prouve
pas le rendu du `pack.json` dans Obsidian :

```text
file:///C:/Users/fxgui/Documents/Code/Perso/schema-pbta/handbook/monsterhearts/preview/index.html
```

Pour une modification limitée à `schema-pbta`, il n'est pas nécessaire de
lancer `npm run dev` dans Handbook : `dev:schema-pbta` et Hot Reload suffisent.
`npm run dev` reste nécessaire lorsqu'on modifie aussi le TypeScript ou les SCSS
propres à Handbook.
