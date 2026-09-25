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

### Composants de saisie

**Champ de saisie multi-lignes** (Editor) :
Composant texte riche multi-lignes ; le champ d'entrée principal en est une instance, ainsi que les champs texte de certains panneaux.
_À éviter_ : zone de texte, textarea

**Champ d'entrée principal** (composer) :
Le grand champ en bas de l'écran où l'utilisateur tape ses messages à l'agent ; instance d'Editor.
_À éviter_ : prompt box, boîte de message

**Champ de saisie mono-ligne** (Input) :
Composant texte limité à une ligne ; ex. le champ de follow-up du hub BTW History.
_À éviter_ : input box, ligne de commande

**Dictée** (speech-to-text, STT) :
Transcription vocale vers le champ texte ciblé ; deux déclencheurs cohabitants : le geste maintenir-Espace (local au champ) et la touche globale `app.stt.toggle` (routée vers le champ texte déclaré qui a le focus).
_À éviter_ : reconnaissance vocale (ambigu)

### Vocabulaire fork

**Amont** (upstream) :
Le dépôt d'origine `can1357/oh-my-pi` dont le fork `kml93/oh-my-pi` synchronise les changements ; « commit d'amont » = changement mergé par can1357 dans son main.
_À éviter_ : origin (désigne le fork), base
