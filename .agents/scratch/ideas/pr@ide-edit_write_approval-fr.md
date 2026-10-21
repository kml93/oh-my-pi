# Feature : voir et corriger les edits d'OMP dans mon IDE

## Mon intention (le vrai besoin)

Quand OMP demande une approbation pour modifier des fichiers, je veux voir la proposition dans MON IDE sous forme d'onglets diff (gauche = avant, droite = après), corriger le panneau de droite directement dans l'IDE, sauvegarder, et approuver DEPUIS l'IDE. OMP exécute alors MA version des fichiers que j'ai édités.

## Périmètre exact

- Uniquement les outils `edit` et `write`.
- Uniquement quand une approbation interactive est requise (mode "ask-approval" : OMP affiche sa boîte Approve/Deny dans le terminal).
- Hors de ce périmètre (yolo, auto-approuvé, headless sans UI) : comportement natif d'OMP strictement inchangé, on ne gère rien.

## Le problème aujourd'hui

1. Seule la boîte Approve/Deny du terminal peut répondre. Une extension peut observer, mais pas répondre.
2. L'input que reçoit une extension est écrit dans la langue du mode d'edit actif — illisible côté extension sans grosse machinerie.

## La GROSSE contrainte : les modes d'edit (à résoudre en profondeur)

OMP a 5 modes d'edit : `hashline` (le défaut), `replace`, `patch`, `apply_patch`, `sloppy`. Chaque mode est une langue différente. En hashline, UNE SEULE demande peut combiner : modifier plusieurs fichiers, en supprimer (op REM), en renommer (op MV).

**Règle absolue : l'extension ne doit JAMAIS connaître ni parser ces modes.**

**Directive de décomposition :** OMP décompose DÉJÀ chaque demande, en interne, en fichiers individuels avec leur nature (changement de contenu / suppression / renommage) et leur avant/après — c'est le mécanisme qui alimente l'aperçu live du TUI et l'écran d'approbation (voir `waitForToolApprovalPreview` dans le wrapper d'outils, les preview batches d'EditSession). Le hook doit exposer CETTE décomposition, filtrée :
- un onglet IDE par fichier avec un VRAI changement de contenu (modif ou création) ;
- RIEN pour les suppressions et renommages : pas d'onglet, c'est du bruit — ces opérations restent visibles dans la boîte TUI classique et font simplement partie de la demande approuvée.

## Sémantique de la révision (à respecter strictement)

L'extension renvoie UNIQUEMENT les textes finaux des fichiers que l'humain a édités. OMP exécute la demande d'origine avec ces contenus substitués : les fichiers non édités (et les opérations structurelles) s'exécutent TEL QUEL. Jamais de perte silencieuse d'opérations.

## Questions à trancher AVANT de coder

1. **API unifiée ?** Est-il possible d'une API simple pour l'extension : elle reçoit `{fichiers: [{chemin, avant, après}]}` (contenu uniquement) et renvoie `{fichiers: [{chemin, contenu final}]}` (seulement les édités) ? L'extension reste triviale : afficher + renvoyer.
2. **Le problème du tag/hash.** OMP ancre lectures/edits avec un tag de snapshot `[fichier#TAG]` (hash du contenu). Après un edit révisé, le tag connu du modèle est périmé. Trouve le moyen que le résultat de l'edit révisé porte un tag FRAIS (le store de snapshots sait en frayer un) — sinon le modèle échoue ou doit tout relire.
3. **Où se brancher + la course.** Réfléchis au point de branchement exact (la porte d'approbation du wrapper d'outils) et à la course entre la réponse IDE et la réponse TUI : la boîte TUI est TOUJOURS ouverte en ask-approval ; la première réponse gagne ; l'autre disparaît instantanément ; une réponse tardive de l'extension est refusée (retourne false) ; un abort débloque tout même si un handler d'extension est bloqué.
4. **Notification de fermeture.** Quand la réponse vient du TUI (pas de l'IDE), l'extension doit recevoir un événement de résolution pour fermer ses onglets.

## Contraintes de sécurité (non négociables)

- Le contenu renvoyé est VALIDÉ contre le schéma de l'outil, et CHAQUE fichier édité repasse devant la politique d'approbation (une extension ne doit pas pouvoir glisser un fichier que l'humain n'a pas vu).
- Les chemins restent dans le référentiel du modèle (relatifs au cwd quand le fichier y vit).
- Les safety checks provider (outil computer) restent réservés à l'UI.

## Découpage en PR

- **PR côté OMP uniquement** : le hook (décomposition exposée + API de réponse), la course, la validation, la notification de résolution, les tests (modes multiples, demande mixte modifie+supprime+renomme, tag frais, abort, réponse TUI ferme les onglets), la doc. Minimal : réutiliser l'existant au maximum, zéro duplication, pas de réinvention.
- **L'extension IDE est HORS PR** : elle vit dans ma config, simple, sans aucune connaissance des modes.

## Comportement final voulu (critères d'acceptation)

1. edit/write en ask-approval → un onglet IDE par fichier À CONTENU MODIFIÉ. Rien pour les suppressions/renommages.
2. J'édite le panneau droit, je sauvegarde, j'approuve dans l'IDE → OMP exécute MA version pour ces fichiers ; tout le reste de la demande s'exécute tel quel.
3. La boîte Approve/Deny du TUI reste ouverte en parallèle ; à la première réponse (IDE ou TUI) elle disparaît instantanément.
4. Si je réponds dans le TUI → l'extension est prévenue et ferme ses onglets.
5. Ça marche quel que soit le mode d'edit configuré, sans rien changer à l'extension.
6. Le résultat que voit le modèle porte un tag de snapshot frais.
7. Hors ask-approval ou en headless → comportement natif d'OMP inchangé.
