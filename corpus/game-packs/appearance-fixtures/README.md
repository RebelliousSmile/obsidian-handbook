# Fixtures GamePack historiques

Ces cinq fichiers JSON proviennent de
`RebelliousSmile/schema-appearance/examples/appearance/game-pack/` au
2026-09-15. Ce dépôt a été supprimé le 2026-09-20 : ces copies sont désormais
la seule trace des fixtures. Ils couvrent Adrenaline, City of Mist, Legend in the Mist et
:Otherscape, ainsi qu’un exemple de zones City of Mist.

Ils sont conservés sans transformation comme corpus de compatibilité du
schéma Handbook. `pnpm assert:game-pack-contract` les valide avec Ajv puis les
projette avec `readGamePack`.
