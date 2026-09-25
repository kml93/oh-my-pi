# Panneaux d'information transitoires pour les commandes d'information

## Quoi

Je m'appuie souvent sur `/context` et les commandes du même genre pour suivre ce que fait l'agent, mais leur affichage permanent rend le chat inutilisable : les blocs s'accumulent dans l'historique et, pendant un tour de l'agent, dès deux ou trois commandes, plus rien n'est visible tant qu'il n'a pas fini. Pour moi, le chat doit rester concentré sur l'échange avec l'agent, pas sur du bruit — cette PR affiche donc ces commandes dans un panneau temporaire, sur le modèle de `/session info`.

Les commandes d'information (`/context`, `/hotkeys`, `/tools`, `/memory view`, `/memory stats`, `/jobs`, `/session info`, `/ssh list`, `/ssh help`) ouvrent désormais un panneau transitoire focal au-dessus de l'éditeur, au lieu d'empiler des blocs permanents dans le transcript :

- `SessionInfoOverlay` généralisée et renommée `InfoPanelOverlay` (titre paramétrable, contenu Texte ou Markdown), réutilisée partout.
- Un presenter unique `showInfoPanel` sur `InteractiveMode` détruit le panneau précédent avant d'en ouvrir un nouveau — jamais deux à la fois, zéro résidu dans le transcript.
- Les panneaux sont des instantanés à l'ouverture ; ↑/↓ fait défiler, Esc ferme et rend le focus à l'éditeur.
- Six actions de raccourcis sans touche par défaut : `app.context.show`, `app.hotkeys.show`, `app.tools.show`, `app.memory.view`, `app.memory.stats`, `app.jobs.show`.
- La sortie texte ACP est inchangée ; `/usage`, `/settings`, `/agents` gardent leurs overlays plein écran ; `/changelog`, `/mcp*`, `/advisor*` gardent leurs blocs de transcript.

## Pourquoi

Chaque invocation ajoutait un bloc permanent au transcript du chat. Lancées plusieurs fois de suite, elles enterrent la conversation et polluent l'historique ; pire, la sortie différée des commandes pendant un tour de streaming empile des panneaux de prévisualisation jusqu'à masquer tout le reste (mécanisme #4806). Le panneau de `/session info` avait déjà le comportement voulu ; cette PR généralise cet idiome à toute la famille.

## Tests

- `bun run check:ts`, `bun run lint:ts`, `bun run check:tools` passent.
- La suite TS complète passe (seuls des échecs préexistants propres à la machine restent, reproduits à l'identique sur `main` nu : conversion PNG des vignettes Kitty, encodage pourcent du `@` dans les URL VS Code du chemin de checkout).
- Smoke TUI interactif, exercé de bout en bout : `/context` lancé deux fois → un seul panneau qui se remplace, aucun résidu ; Esc ferme et rend le focus à l'éditeur ; ↑/↓ fait défiler les charges Markdown longues (`/hotkeys`, `/memory stats` rendent des tables) ; panneaux `/jobs`, `/ssh list`, `/tools`, `/session info` vérifiés.
- Tests : `InfoPanelOverlay` (cas titre + Markdown), câblage des raccourcis dans input-controller (une touche mappée ouvre le panneau, les défauts ne lient rien), et un test de zéro-résidu via `handleToolsCommand` à travers un tour en streaming.

---

- [x] `bun check` passe
- [x] Testé localement
- [ ] CHANGELOG mis à jour avec l'attribution requise (si orienté utilisateur ; les corrections d'issues internes utilisent des liens d'issue, les contributions externes ajoutent le lien PR et le crédit contributeur après création)
