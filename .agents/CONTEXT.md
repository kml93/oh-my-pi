# oh-my-pi (omp)

Agent de codage en CLI construit autour d'un transcript de chat TUI. Ce glossaire fixe le vocabulaire décrivant comment la sortie d'une commande atteint l'utilisateur.

## Vocabulaire

### Canaux d'affichage

**Panneau transitoire** (transient info panel) :
Panneau focalisé et refermable, ancré au-dessus de l'éditeur, montrant un instantané de la sortie d'une commande ; une nouvelle invocation le remplace et sa fermeture ne laisse aucune trace.
_À éviter_ : widget, popup, toast

**Overlay plein écran** (fullscreen overlay) :
Overlay sur l'écran alternatif qui remplace temporairement toute l'UI (settings, dashboard d'usage, hubs) ; auto-remplacé, sans trace dans le transcript.
_À éviter_ : dashboard (pour le mécanisme lui-même)

**Bloc de commande transcript** (transcript command block) :
Bloc à bordures ajouté dans le transcript du chat comme ligne d'historique permanente ; les invocations s'empilent.
_À éviter_ : message de chat, sortie de commande (trop générique)

### Raccourcis clavier

**Action clavier non liée** (unbound key action) :
Action de raccourci déclarée sans touches par défaut ; active uniquement si l'utilisateur la mappe dans sa configuration.
_À éviter_ : raccourci désactivé
