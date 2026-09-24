# Les commandes d'information s'affichent en panneaux transitoires, pas en blocs de transcript

Les slash commands qui affichent de l'information de référence ou de statut (`/context`, `/hotkeys`, `/tools`, `/memory view|stats`, `/jobs`, `/ssh list|help`) ouvrent un panneau transitoire au-dessus de l'éditeur au lieu d'ajouter des blocs de commande transcript, qui s'empilaient à chaque invocation et enterraient la conversation. Chaque panneau expose exactement une action clavier non liée (`defaultKeys: []`) pour que les raccourcis restent opt-in. Les overlays plein écran restent réservés aux hubs et dashboards interactifs (`/usage`, `/settings`, `/agents`), et la sortie ACP texte est inchangée.

## Options envisagées

- Blocs de commande transcript : garde la sortie dans l'historique défilant, mais s'empile à chaque invocation et enterre le chat — rejeté pour des commandes d'information relancées souvent.
- Overlays plein écran (l'idiom `/usage show`) : propre mais disproportionné pour une sortie moyenne consultée d'un coup d'œil.
