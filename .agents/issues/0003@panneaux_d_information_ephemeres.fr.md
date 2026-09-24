# Panneaux d'information éphémères pour les commandes d'info (`/context`, `/hotkeys`, `/tools`, `/memory`, `/jobs`, `/ssh`)

## Problème

Chaque invocation de `/context` (et des commandes d'info de la même famille) ajoute un bloc permanent dans le transcript du chat. Relancées plusieurs fois de suite, elles enterrent la conversation et polluent l'historique. `/session info` a déjà le comportement voulu : un panneau focalisé qui se remplace sans laisser de trace.

## Solution

Les commandes d'information ouvrent un *panneau transitoire* (l'idiom `/session info`) : ancré au-dessus de l'éditeur, capture le focus, ↑/↓ défile, Esc ferme, instantané à l'ouverture, remplacé à chaque nouvelle invocation, zéro trace dans le chat. `SessionInfoOverlay` est généralisé (titre paramétrable, contenu Text ou Markdown) et réutilisé partout. Une action clavier non liée (`defaultKeys: []`) par panneau. Les overlays plein écran restent réservés aux hubs et dashboards interactifs ; la sortie ACP texte est inchangée. Décision consignée dans `.agents/docs/adr/0001@commandes_d_information_s_affichent.fr.md` ; vocabulaire dans `.agents/CONTEXT.md`.

## User Stories

1. `/context` ouvre un panneau au lieu d'empiler un bloc de chat.
2. Une nouvelle invocation remplace le panneau existant — jamais deux.
3. Esc ferme le panneau et rend le focus à l'éditeur.
4. ↑/↓ défile quand le contenu dépasse l'écran.
5. Le contenu est un instantané à l'ouverture (pas de rafraîchissement live).
6. `/hotkeys` affiche la référence des raccourcis dans ce panneau.
7. `/tools` affiche les outils visibles par l'agent, idem.
8. `/memory view` affiche le payload mémoire injecté, idem.
9. `/memory stats` affiche les statistiques mémoire, idem.
10. `/jobs` affiche les tâches de fond, idem.
11. `/ssh list` et `/ssh help` affichent hôtes/aide, idem.
12. Je peux mapper une touche sur `app.context.show` via ma config keybindings.
13. Idem `app.hotkeys.show`, `app.tools.show`, `app.memory.view`, `app.memory.stats`, `app.jobs.show`.
14. Aucune touche par défaut n'est affectée (rien d'intrusif).
15. Le markdown est rendu dans les panneaux concernés.
16. Les clients ACP reçoivent toujours le texte actuel — aucune régression.
17. `/usage`, `/settings`, `/agents` gardent leurs overlays plein écran (inchangés).
18. `/changelog`, `/mcp*`, `/advisor*` restent en blocs de transcript (exclusion volontaire).

## Décisions d'implémentation

- Généraliser `SessionInfoOverlay` (`packages/tui/src/overlays/session-info-overlay.ts`) : titre + contenu Text|Markdown, réutilisé par toutes les conversions.
- Un presenter commun côté coding-agent détruit l'ancien panneau avant d'ouvrir le nouveau (pattern `showSessionInfo`/`#hideSessionInfo`, `interactive-mode.ts:6089`).
- Actions clavier déclarées dans `packages/tui/src/app-keybindings.ts` avec `defaultKeys: []` (précédent `app.approval.cycle`), câblées à la manière d'`app.agents.hub` (`input-controller.ts:707`).
- Conversions : `/context` (`command-controller.ts:699`), `/hotkeys` (:688), `/tools` (:691), `/memory view` (:721) + `/memory stats` (showMarkdownPanel), `/jobs` (:590), `/ssh list` + `/ssh help` (`helpers/ssh.ts`).
- Sémantique instantané : aucun abonnement live ; fermer/rouvrir pour rafraîchir (cohérent avec `/session info`).
- Une seule PR (décision utilisateur).

## Hors périmètre

- Conversions de `/changelog`, `/mcp*`, `/advisor*`.
- Panneaux live.
- Chemins ACP texte.

## Vérification

Dans le TUI interactif : lancer `/context` plusieurs fois et confirmer un panneau unique auto-remplacé sans résidu de transcript ; Esc rend le focus à l'éditeur ; ↑/↓ défile les payloads longs (`/hotkeys`, `/memory view`) ; le markdown est rendu ; les touches custom mappées ouvrent les panneaux `app.*.show` tandis que les défauts ne bindent rien ; la sortie ACP des commandes converties est identique octet par octet à avant.

Cible : PR OMP amont, branche depuis `main`, suivie dans ce dépôt fork.
