import type { Translations } from "./types";

/** French. Keys are the English texts; see `src/utils/i18n.ts` for how a language is added. */
export const fr: Translations = {
	// Menus
	"Tag, status or limit": "Tag, statut ou limite",
	"Multi-column region": "Région multicolonne",
	"Insert callout": "Insérer un callout",
	"Change callout type": "Changer le type de callout",
	"{name} callout": "Callout {name}",
	"Paste toml into {noun}": "Coller du TOML dans {noun}",
	"Copy {noun} as TOML": "Copier {noun} en TOML",
	"Roller table": "Table de lancer",
	"Theme card": "Carte de thème",
	"Challenge": "Défi",
	"Danger profile": "Profil de danger",
	"Theme kit": "Kit de thème",
	"Journey": "Voyage",
	"PbtA character playbook": "Livret de personnage PbtA",
	"PbtA move": "Move PbtA",
	"Theme :Otherscape": "Thème :Otherscape",
	"Theme kit :Otherscape": "Kit de thème :Otherscape",
	"Challenge :Otherscape": "Défi :Otherscape",
	"Power Set :Otherscape": "Jeu de pouvoirs :Otherscape",
	"Character trope :Otherscape": "Trope de personnage :Otherscape",
	"Loadout item :Otherscape": "Objet d'équipement :Otherscape",

	// Commands
	"Reload illustrations and personal overrides": "Recharger les illustrations et les réglages personnels",
	"Clean up callouts the game does not declare": "Nettoyer les callouts que le jeu ne déclare pas",

	// Notices of the callout cleanup
	"Every callout is declared by the game.": "Tous les callouts sont déclarés par le jeu.",
	"{count} callout(s) moved to the game's first callout.": "{count} callout(s) ramené(s) au premier callout du jeu.",

	// Callout templates
	"Title of the note": "Titre de la note",
	"Content of the note": "Contenu de la note",
	"Text to read aloud": "Texte à lire à voix haute",

	// TOML export and paste
	"Cannot copy this {noun}: {reason}.": "Impossible de copier {noun} : {reason}.",
	"Copied the {noun} as TOML.": "Copié en TOML : {noun}.",
	"Could not write the TOML to the clipboard.": "Impossible d'écrire le TOML dans le presse-papiers.",
	"Could not locate this block in the note.": "Impossible de localiser ce bloc dans la note.",
	"Could not read toml from the clipboard.": "Impossible de lire le TOML du presse-papiers.",
	"Clipboard does not match this {noun} TOML document.": "Le TOML du presse-papiers ne correspond pas à {noun}.",
	"The source note is no longer available.": "La note source n'est plus disponible.",
	"This block changed before it could be updated; nothing was overwritten.":
		"Ce bloc a changé avant sa mise à jour ; rien n'a été écrasé.",
	"Pasted TOML into the {noun}.": "TOML collé dans {noun}.",
	"Could not update the source note.": "Impossible de mettre à jour la note source.",

	// What a TOML export is named
	"noun:theme card": "la carte de thème",
	"noun:challenge": "le défi",
	"noun:journey": "le voyage",
	"noun:theme kit": "le kit de thème",
	"noun:city theme card": "la carte de thème City",
	"noun:danger": "le danger",
	"noun::Otherscape theme": "le thème :Otherscape",
	"noun::Otherscape theme kit": "le kit de thème :Otherscape",
	"noun::Otherscape challenge": "le défi :Otherscape",
	"noun::Otherscape power set": "le jeu de pouvoirs :Otherscape",
	"noun::Otherscape character trope": "le trope de personnage :Otherscape",
	"noun::Otherscape loadout item": "l'objet d'équipement :Otherscape",
	"noun:Adrenaline player character": "le personnage joueur Adrenaline",
	"noun:Adrenaline non-player character": "le personnage non joueur Adrenaline",
	"noun:Adrenaline monster": "le monstre Adrenaline",
	"noun:PbtA playbook": "le livret PbtA",
	"noun:PbtA move": "le move PbtA",

	// Settings: sections
	"Installed versions": "Versions installées",
	"Game and appearance": "Jeu et apparence",
	"Schema sources": "Sources de schémas",
	"Callouts": "Callouts",
	"Advanced": "Avancé",

	// Settings: game and appearance
	"Game mode": "Mode de jeu",
	"Choose the game line you are preparing for. This updates the main style and the editor context menu.":
		"Choisissez la gamme de jeu que vous préparez. Cela met à jour le style principal et le menu contextuel de l'éditeur.",
	"No game installed": "Aucun jeu installé",
	"No pack installed.": "Aucun pack installé.",
	"Schema {schema} · Appearance pack {pack}": "Schéma {schema} · Pack d'apparence {pack}",
	"Appearance pack {pack}": "Pack d'apparence {pack}",
	"Universe": "Univers",
	"Choose the visual identity applied to the whole vault.": "Choisissez l'identité visuelle appliquée à tout le coffre.",
	"Colour scheme": "Jeu de couleurs",
	"The active game has both a light and a dark scheme. Follow Obsidian to keep them aligned, or choose one scheme for the plugin.":
		"Le jeu actif propose un jeu de couleurs clair et un sombre. Suivez Obsidian pour les garder alignés, ou choisissez-en un pour le plugin.",
	"Follow Obsidian": "Suivre Obsidian",
	"Light": "Clair",
	"Dark": "Sombre",
	"Theme features": "Fonctionnalités du thème",
	"Review the callouts and code blocks declared for the active game.":
		"Consultez les callouts et les blocs de code déclarés pour le jeu actif.",
	"View": "Afficher",
	"Personal overrides": "Réglages personnels",
	"Reload": "Recharger",
	"Personal overrides reloaded.": "Réglages personnels rechargés.",
	"Failed to reload the personal overrides.": "Impossible de recharger les réglages personnels.",
	"The active pack is {pack}. To change a colour or a font of your own, write the custom properties into {file}, in this plugin's folder in the vault. What the file leaves out keeps the value of the game; removing the file restores it whole.":
		"Le pack actif est {pack}. Pour changer une couleur ou une police à votre façon, écrivez les propriétés personnalisées dans {file}, dans le dossier de ce plugin du coffre. Ce que le fichier omet garde la valeur du jeu ; supprimer le fichier la restaure en entier.",
	"Roller tables": "Tables de lancer",
	"Enable generic table rollers that use Dice Roller and copy results.":
		"Active les lanceurs de tables génériques qui utilisent Dice Roller et copient les résultats.",
	"Enable Dice Roller first to use generic table rollers.":
		"Activez d'abord Dice Roller pour utiliser les lanceurs de tables génériques.",
	"Workspace theme": "Thème de l'espace de travail",
	"Paint the whole window in the colours of the game, not only the notes. No other game has one yet.":
		"Peint toute la fenêtre aux couleurs du jeu, et pas seulement les notes. Aucun autre jeu n'en a encore.",
	"Failed to save Handbook settings.": "Impossible d'enregistrer les réglages de Handbook.",

	// Settings: Lantern
	"Lantern in the Mist integration": "Intégration de Lantern in the Mist",
	"Show the ribbon icon and keep the embedded Lantern in the Mist view available.":
		"Affiche l'icône du ruban et garde disponible la vue Lantern in the Mist intégrée.",
	"Lantern in the Mist URL": "URL de Lantern in the Mist",
	"Address used by the Lantern in the Mist ribbon action and embedded tab.":
		"Adresse utilisée par l'action du ruban et par l'onglet intégré de Lantern in the Mist.",

	// Settings: schema sources
	"Repositories": "Dépôts",
	"No schema repository is registered yet.": "Aucun dépôt de schéma n'est encore enregistré.",
	"1 schema repository is registered.": "1 dépôt de schéma est enregistré.",
	"{count} schema repositories are registered.": "{count} dépôts de schéma sont enregistrés.",
	"Add source": "Ajouter une source",
	"Latest release": "Dernière version",
	"Tag: {value}": "Tag : {value}",
	"Branch: {value}": "Branche : {value}",
	"{reference} · Checking installed version…": "{reference} · Vérification de la version installée…",
	"Check for update": "Vérifier les mises à jour",
	"Checking {repository}…": "Vérification de {repository}…",
	"{repository} is already up to date.": "{repository} est déjà à jour.",
	"{repository} updated.": "{repository} mis à jour.",
	"Schema update failed: {reason}": "Échec de la mise à jour du schéma : {reason}",
	"Edit": "Modifier",
	"Remove": "Retirer",
	"{reference} · {status}": "{reference} · {status}",
	"Installed": "Installé",
	"Not installed": "Non installé",
	"Edit schema source": "Modifier la source de schéma",
	"Add schema source": "Ajouter une source de schéma",
	"GitHub repository": "Dépôt GitHub",
	"Reference": "Référence",
	"Tag": "Tag",
	"Branch": "Branche",
	"Save and check": "Enregistrer et vérifier",
	"Enter an owner/repository and, when required, a reference.":
		"Saisissez un propriétaire/dépôt et, si nécessaire, une référence.",
	"Schema source was not installed: {reason}": "La source de schéma n'a pas été installée : {reason}",
	"Remove schema source": "Retirer la source de schéma",
	"Remove {repository} and all of its installed game packs?":
		"Retirer {repository} et tous ses packs de jeu installés ?",
	"Remove source": "Retirer la source",
	"Schema source was not removed: {reason}": "La source de schéma n'a pas été retirée : {reason}",

	// Settings: game blocks
	"Theme card parser": "Analyseur de cartes de thème",
	"Enable the com-theme-card code block parser and context menu action.":
		"Active l'analyseur du bloc de code com-theme-card et son action de menu contextuel.",
	"Danger profile parser": "Analyseur de profils de danger",
	"Enable the com-danger code block parser and context menu action.":
		"Active l'analyseur du bloc de code com-danger et son action de menu contextuel.",
	"Iceberg canvas snippet": "Snippet de canevas Iceberg",
	"Copy snippet": "Copier le snippet",
	"Iceberg canvas snippet copied to clipboard.": "Snippet de canevas Iceberg copié dans le presse-papiers.",
	"Failed to copy the iceberg snippet.": "Impossible de copier le snippet Iceberg.",
	"Enable the theme-card code block parser and context menu action. The older story-theme ID keeps working.":
		"Active l'analyseur du bloc de code theme-card et son action de menu contextuel. L'ancien identifiant story-theme continue de fonctionner.",
	"Challenge parser": "Analyseur de défis",
	"Enable the litm-challenge code block parser and context menu action.":
		"Active l'analyseur du bloc de code litm-challenge et son action de menu contextuel.",
	"Journey parser": "Analyseur de voyages",
	"Enable the litm-journey code block parser and context menu action.":
		"Active l'analyseur du bloc de code litm-journey et son action de menu contextuel.",
	"Theme kit parser": "Analyseur de kits de thème",
	"Enable the litm-theme-kit code block parser and context menu action.":
		"Active l'analyseur du bloc de code litm-theme-kit et son action de menu contextuel.",
	"Mountain canvas snippet": "Snippet de canevas Montagne",
	"Mountain canvas snippet copied to clipboard.": "Snippet de canevas Montagne copié dans le presse-papiers.",
	"Failed to copy the mountain snippet.": "Impossible de copier le snippet Montagne.",
	"Install {link} by Developer-Mike, then go to Settings > Appearance > CSS snippets, create a snippet named {file}, paste the copied content into that file, and enable the snippet.":
		"Installez {link} de Developer-Mike, puis allez dans Réglages > Apparence > Extraits CSS, créez un extrait nommé {file}, collez-y le contenu copié et activez l'extrait.",
	"Themes": "Thèmes",
	"Theme kits": "Kits de thème",
	"Challenges": "Défis",
	"Power sets": "Jeux de pouvoirs",
	"Character tropes": "Tropes de personnage",
	"Loadout items": "Objets d'équipement",
	"Enable the {block} TOML block and its insertion.": "Active le bloc TOML {block} et son insertion.",

	// Settings: advanced
	"Validate installed packs": "Valider les packs installés",
	"Check pack manifests, declared capabilities, and local resources. This does not download updates.":
		"Vérifie les manifestes des packs, les capacités déclarées et les ressources locales. Aucune mise à jour n'est téléchargée.",
	"Validate": "Valider",
	"PbtA playbook coverage": "Couverture des livrets PbtA",
	"View coverage": "Afficher la couverture",
	"Log level": "Niveau de journalisation",
	"Control how much information is logged to the developer console.":
		"Règle la quantité d'informations écrites dans la console de développement.",
	"Debug (verbose)": "Débogage (détaillé)",
	"Info": "Infos",
	"Warnings": "Avertissements",
	"Errors only": "Erreurs uniquement",
	"None (disable logs)": "Aucun (désactiver les journaux)",

	// Settings: callouts
	"Delete": "Supprimer",
	"Delete the callout \"{name}\"?": "Supprimer le callout \"{name}\" ?",
	"+ new callout": "+ nouveau callout",
	"All games": "Tous les jeux",
	"none": "aucun",
	"Scope: {scope} · aliases: {aliases}. {hint}": "Portée : {scope} · alias : {aliases}. {hint}",
	"Scope: {scope} · aliases: {aliases}.": "Portée : {scope} · alias : {aliases}.",
	"Scope: {scope}. Only the aliases can be edited here, one per line. {hint}":
		"Portée : {scope}. Seuls les alias sont modifiables ici, un par ligne. {hint}",
	"Scope: {scope}. Only the aliases can be edited here, one per line.":
		"Portée : {scope}. Seuls les alias sont modifiables ici, un par ligne.",
	"Shortcut: Settings → Hotkeys → search for \"{command}\".":
		"Raccourci : Réglages → Raccourcis clavier → rechercher \"{command}\".",
	"Edit callout": "Modifier le callout",
	"New callout": "Nouveau callout",
	"Name": "Nom",
	"Aliases": "Alias",
	"One alias per line. The first one is inserted from the context menu.":
		"Un alias par ligne. Le premier est inséré depuis le menu contextuel.",
	"Scope": "Portée",
	"Where this callout is available.": "Où ce callout est disponible.",
	"Template": "Gabarit",
	"Title + body": "Titre + corps",
	"Body only": "Corps seul",
	"Icon": "Icône",
	"Icon name (optional).": "Nom d'icône (facultatif).",
	"Unknown icon: \"{icon}\".": "Icône inconnue : \"{icon}\".",
	"Font": "Police",
	"Heading": "Titre",
	"Text": "Texte",
	"Colour": "Couleur",
	"Fixed": "Fixe",
	"Follows the theme": "Suit le thème",
	"Fixed colour": "Couleur fixe",
	"Cancel": "Annuler",
	"Save": "Enregistrer",
	"The name is required.": "Le nom est obligatoire.",
	"The alias \"{alias}\" is already used by \"{name}\" in a scope that overlaps this one.":
		"L'alias \"{alias}\" est déjà utilisé par \"{name}\" dans une portée qui recouvre celle-ci.",

	// Settings: pack integration check
	"No plugin manifest installed.": "Aucun manifeste de plugin installé.",
	"Unsupported capability: {detail}.": "Capacité non prise en charge : {detail}.",
	"Block unavailable: {detail}.": "Bloc indisponible : {detail}.",
	"Style unavailable: {detail}.": "Style indisponible : {detail}.",
	"Resource unavailable: {detail}.": "Ressource indisponible : {detail}.",
	"Could not inspect this pack: {detail}.": "Impossible d'inspecter ce pack : {detail}.",
	"Pack integration check": "Vérification de l'intégration des packs",
	"Checking every registered pack…": "Vérification de tous les packs enregistrés…",
	"Pack integration check failed": "Échec de la vérification de l'intégration des packs",
	"Try again. {reason}": "Réessayez. {reason}",
	"Retry": "Réessayer",
	"No game pack is registered in this vault.": "Aucun pack de jeu n'est enregistré dans ce coffre.",
	"{installed} installed · {ready} ready · {attention} need attention.":
		"{installed} installé(s) · {ready} prêt(s) · {attention} à vérifier.",
	"Registered packs": "Packs enregistrés",
	"Plugin manifest installed.": "Manifeste de plugin installé.",
	"Plugin manifest missing.": "Manifeste de plugin manquant.",
	"No declared capabilities.": "Aucune capacité déclarée.",
	"Capabilities: {list}.": "Capacités : {list}.",
	"Blocks: {list}.": "Blocs : {list}.",
	"No declared blocks.": "Aucun bloc déclaré.",
	"Styles: {list}.": "Styles : {list}.",
	"No declared styles.": "Aucun style déclaré.",
	"Ready: {label}": "Prêt : {label}",
	"Needs attention: {label}": "À vérifier : {label}",

	// Settings: PbtA coverage
	"No PbtA format gaps detected. Formats for other game packs are available when those packs are installed.":
		"Aucun format PbtA manquant. Les formats des autres packs de jeu sont disponibles quand ces packs sont installés.",
	"Some playbook formats are not fully readable in this vault.":
		"Certains formats de livret ne sont pas entièrement lisibles dans ce coffre.",
	"Game-specific formats": "Formats propres à un jeu",
	"This build reads no game-specific playbook format.": "Cette version ne lit aucun format de livret propre à un jeu.",
	"Supported by this build. Install the \"{pack}\" pack to use it.":
		"Pris en charge par cette version. Installez le pack \"{pack}\" pour l'utiliser.",
	"Readable. Expects the \"{pack}\" pack, installed.": "Lisible. Attend le pack \"{pack}\", installé.",
	"Formats read as a portable playbook": "Formats lus comme un livret portable",
	"Expected, not a problem: these games describe a playbook the portable schema already covers, so their documents are read as generic playbooks and their game definition carries what is specific to them.":
		"Normal, pas un problème : ces jeux décrivent un livret que le schéma portable couvre déjà, donc leurs documents sont lus comme des livrets génériques et leur définition de jeu porte ce qui leur est propre.",
	"No distinguishing field.": "Aucun champ distinctif.",
	"Formats not read yet": "Formats pas encore lus",
	"The installed schema source carries these playbook formats and this build does not read them yet. Their documents still render as generic playbooks, without whatever each format adds.":
		"La source de schéma installée contient ces formats de livret et cette version ne les lit pas encore. Leurs documents s'affichent quand même comme des livrets génériques, sans ce que chaque format ajoute.",
	"Newer than this build.": "Plus récent que cette version.",
	"Installed PbtA packs": "Packs PbtA installés",
	"No installed pack declares a PbtA capability.": "Aucun pack installé ne déclare de capacité PbtA.",
	"1 installed game-specific format readable": "1 format propre à un jeu installé est lisible",
	"{count} installed game-specific formats readable": "{count} formats propres à un jeu installés sont lisibles",
	"PbtA coverage: {readable}, no format gaps.": "Couverture PbtA : {readable}, aucun format manquant.",
	"PbtA coverage: {readable}, 1 finding.": "Couverture PbtA : {readable}, 1 constat.",
	"PbtA coverage: {readable}, {count} findings.": "Couverture PbtA : {readable}, {count} constats.",

	// Settings: starter kits
	"Choose a starter kit": "Choisir un kit de démarrage",
	"Handbook has no game installed yet. Choose a starter kit to install its schema source and make the plugin useful immediately.":
		"Aucun jeu n'est encore installé dans Handbook. Choisissez un kit de démarrage pour installer sa source de schéma et rendre le plugin utile tout de suite.",
	"No starter kit catalogue is available in this release.": "Aucun catalogue de kits de démarrage n'est disponible dans cette version.",
	"Install": "Installer",
	"Installing…": "Installation…",
	"{label} is ready.": "{label} est prêt.",
	"Could not install {label}: {reason}": "Impossible d'installer {label} : {reason}",
	"unknown error": "erreur inconnue",

	// Settings: theme features
	"{game} features": "Fonctionnalités de {game}",
	"Handouts": "Handouts",
	"No handout is declared for this game.": "Aucun handout n'est déclaré pour ce jeu.",
	"Code block: {ids}": "Bloc de code : {ids}",
	"No callout is declared for this game.": "Aucun callout n'est déclaré pour ce jeu.",
	"ID: {id}": "ID : {id}",
	"Code blocks": "Blocs de code",
	"No code block is declared for this game.": "Aucun bloc de code n'est déclaré pour ce jeu.",

	// Roller
	"Roll and copy result": "Lancer et copier le résultat",
	"Dice roller must be enabled to roll this table.": "Dice roller doit être activé pour lancer cette table.",
	"Roll result copied to clipboard.": "Résultat du tirage copié dans le presse-papiers.",
	"Could not roll or copy this table result.": "Impossible de lancer cette table ou d'en copier le résultat.",
};
