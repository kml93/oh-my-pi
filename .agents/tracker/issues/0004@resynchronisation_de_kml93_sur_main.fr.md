# Resynchronisation de kml93 sur main via resync des PRs amont en conflit

## Problème

kml93 a ~280 commits de retard sur `main` (242 au handoff + 38 arrivés depuis, tip `ba344f5e69`). Un merge direct conflit sur 6 fichiers, causés par 3 PRs fork encore OPEN côté amont (can1357) mais déjà mergées en avance dans kml93. En prime, `main` a mergé sa propre implémentation STT qui chevauche l'une de ces PRs : un merge naïf ferait disparaître soit le fix amont, soit le routage global de dictée du fork.

## Solution

Relancer les 3 merges des branches PR vers le tip de `main` au moment de l'exécution (re-fetch immédiat avant relance ; `ba344f5e69` au jour de la spec) — état brut du merge auto, aucune résolution manuelle en place, coût de relance ≈ 0 —, résoudre les conflits dans chaque branche avec un diff minimal, puis assembler kml93 (`main` d'abord, puis chaque branche), vérifier, et pousser en dernier. Le chevauchement STT est réconcilié sémantiquement : le contrôleur refactoré d'amont devient la base commune, le geste maintenir-Espace d'amont reste intact, le routeur de dictée du fork se ré-exprime par-dessus ET étend sa touche globale aux champs mono-lignes (dont le follow-up `/btw`) — rendu possible par la surface de dictée standardisée qu'amont vient de donner à ces composants.

## User Stories

1. En tant que mainteneur du fork, je veux kml93 mis à jour avec tous les commits amont (tip de `main` au moment de l'exécution — re-fetch avant relance), afin de bénéficier des correctifs et fonctionnalités de `main`.
2. En tant que mainteneur du fork, je veux les conflits résolus dans les branches PR plutôt que dans kml93, afin que ma branche d'intégration ne porte jamais de bruit de résolution appartenant à des PRs ouvertes.
3. En tant que mainteneur du fork, je veux les 3 merges relancés vers le tip de `main` du moment de l'exécution, afin que les branches PR et kml93 soient à jour à 100 % à la fin (les 38 commits connus au jour de la spec ne touchent aucune zone en conflit ; tout tip plus récent est vérifié pareil avant poursuite).
4. En tant que mainteneur du fork, je veux la PR backend Codex STT resyncée en premier, afin que le conflit de transcription soit réglé avant celui du routage qui le chevauche.
5. En tant que mainteneur du fork, je veux la PR routage global STT resyncée en second, afin que sa résolution s'appuie sur le backend déjà resyncé.
6. En tant que mainteneur du fork, je veux la PR plages de lignes des file-mentions resyncée indépendamment, afin qu'elle progresse en parallèle sans enchevêtrement STT.
7. En tant que mainteneur du fork, je veux les refactors de `main` (registre de settings, URLs internes, utilitaires de chemins) reconnus comme détenus par l'amont, afin que mes résolutions ré-expriment les changements fork par-dessus eux au lieu de les annuler.
8. En tant que mainteneur du fork, je veux le contrôleur STT refactoré d'amont comme base commune, afin que le geste maintenir-Espace et la touche globale partagent un seul moteur de fond.
9. En tant que mainteneur du fork, je veux le geste maintenir-Espace d'amont intact (champ d'entrée principal + follow-up `/btw`), afin que can1357 n'ait rien à re-relire et que l'approbation reste facile.
10. En tant que mainteneur du fork, je veux la touche globale `app.stt.toggle` étendue aux champs mono-lignes dans CE sync — le champ de follow-up `/btw` devient une cible déclarée du routeur — afin que ma dictée couvre tous les champs texte sans exception, en une seule PR de resync.
11. En tant que mainteneur du fork, je veux la coexistence des deux déclencheurs et l'extension de périmètre documentées dans le corps de la PR, afin que les relecteurs amont comprennent ce qui coexiste, pourquoi, et ce que la PR ajoute.
12. En tant que mainteneur du fork, je veux le fixup fork-only sur la signature du test cloud STT replié dans la PR de routage global, afin que la PR soit autonome.
13. En tant que mainteneur du fork, je veux le retrait fork du registre STT legacy gardé fork-local, afin que le diff de la PR amont reste minimal.
14. En tant que mainteneur du fork, je veux les conflits des fichiers catalogue générés résolus par le script de fix dédié, afin que le catalogue bundlé reste déterministe et sans dérive d'édition manuelle.
15. En tant que mainteneur du fork, je veux la suite de tests standard (hors compilation Rust) validée sur chaque branche resyncée avant fusion dans kml93, afin qu'une PR cassée n'atteigne jamais ma branche d'intégration.
16. En tant que mainteneur du fork, je veux l'assemblage vérifié par la porte de types et la suite de tests standard (hors Rust), afin que le fork assemblé soit prouvé sain côté agent.
17. En tant que mainteneur du fork, je veux vérifier moi-même la dictée en TUI réel après assemblage (champ principal, follow-up `/btw`, prompts ask), afin de valider le comportement final du mélange des deux mécanismes.
18. En tant que mainteneur du fork, je veux les pushs faits en dernier (branches PR puis kml93, `main` incluse), afin que rien de public ne bouge avant que tout soit vérifié localement.
19. En tant que mainteneur amont, je veux des branches PR resyncées avec un diff minimal vis-à-vis de leur état revu, afin de ne re-relire que la résolution de conflit et l'extension de périmètre annoncée.
20. En tant que mainteneur amont, je veux la réconciliation STT expliquée dans la description de PR, afin de comprendre la relation entre les deux STT avant de merger.
21. En tant qu'utilisateur du fork, je veux la dictée par touche globale mappée (`app.stt.toggle`) dans le champ principal, les prompts ask, l'extension editor, les overlays ET le follow-up `/btw`, afin de dicter partout où je tape.
22. En tant qu'utilisateur du fork, je veux le maintenir-Espace fonctionnel dans le champ principal et le follow-up `/btw`, afin que le geste rapide reste disponible sans configuration.
23. En tant qu'utilisateur du fork, je veux la transcription qui continue de passer par le backend d'abonnement Codex, afin que la dictée reste sans clé API supplémentaire.
24. En tant qu'utilisateur du fork, je veux les previews de dictation visibles dans le champ pendant que je parle en transcription en flux, et le texte livré en bloc à l'arrêt en transcription one-shot, afin d'avoir un retour adapté au mode sans duplication.
25. En tant qu'utilisateur du fork, je veux l'icône micro visible au curseur du champ qui reçoit la dictée — champ principal comme mono-lignes (dont le follow-up `/btw`), par la touche comme par le geste — afin de toujours savoir que l'enregistrement est actif.
26. En tant qu'utilisateur du fork, je veux les plages de lignes des file-mentions intactes après le sync, afin que ma syntaxe de mention existante continue de résoudre.
27. En tant qu'agent autonome exécutant le sync, je veux un ordre de branches déterministe et des règles de propriété de conflit explicites, afin que l'assemblage n'exige aucune improvisation.

## Décisions d'implémentation

- Relance des 3 merges vers le tip de `main` au moment de l'exécution (re-fetch immédiat avant relance ; `ba344f5e69` au jour de la spec) : les worktrees sont à l'état brut du merge auto (aucune résolution manuelle), les 38 commits connus au jour de la spec ne touchent aucune zone en conflit — abort + relance coûte ≈ 0. Si le tip a encore bougé à l'exécution, vérifier les fichiers touchés par le delta contre les zones en conflit avant de poursuivre. Branche `main` locale mise à jour immédiatement ; push de `main` avec le reste, à la toute fin.
- Resync des branches PR d'abord, jamais de résolution dans kml93. Ordre : backend Codex STT (#12853) puis routage global (#13169, chevauchement contrôleur STT) ; file-mentions (#10623) parallélisable. Assemblage kml93 : `main` d'abord, puis chaque branche ; push en dernier — branches PR puis kml93.
- Réconciliation STT (le tranchage) : la base commune est le contrôleur STT refactoré d'amont (split start/stop, callbacks par capture, fix des previews dans la value). Le routeur du fork se ré-exprime sur cette base : la touche `app.stt.toggle` (écouteur d'input global, transcript vers le champ texte focus à l'arrêt, suivi des changements de focus, fallback brouillon du champ principal) est ÉTENDUE aux champs mono-lignes — la résolution de cible accepte tout composant exposant la surface de dictée standardisée (champs multi-lignes ET mono-lignes), et le champ de follow-up `/btw` est déclaré comme cible. Décision de l'utilisateur : extension dans CE sync. Le geste maintenir-Espace d'amont reste intact dans son périmètre (champ principal + follow-up `/btw`). Coexistence documentée dans le corps de la PR : deux déclencheurs, un moteur.
- Indicateur micro : l'icône micro au curseur (glyphe standardisé et mesuré par amont) s'affiche dans le champ qui reçoit la dictée pendant l'enregistrement — champ principal et mono-lignes, par la touche comme par le geste — corrigeant l'absence constatée dans les champs mono-lignes (aucun retour visuel pendant l'enregistrement).
- Contexte de l'extension : la PR de routage repose sur une base antérieure au commit d'amont qui a doté les champs mono-lignes de la surface de dictée (course de vitesse à 24 h près — d'où les conflits, et d'où la resync comme véhicule naturel de l'extension). Le déclenchement est centralisé (écouteur global unique), la déclaration des cibles reste par composant (chaque panneau expose son champ texte).
- Propriété des conflits croisés à l'assemblage : routage → la PR routage global gagne ; backend de transcription → la PR backend Codex gagne ; geste/previews/surfaces de dictée composants → amont gagne.
- Attribution des refactors : c'est `main` qui a réécrit le mode interactif (registre de settings, URLs internes) et les utilitaires de chemins — pas les PRs fork. Les résolutions resync ré-expriment les changements fork sur le refactor amont, jamais l'inverse.
- Issue #2 (spec STT v2) : maintenir ouverte et liée à la PR de routage global ; fermeture le jour où les PRs sont mergées amont.
- Fixups fork-only : le fixup de signature du test cloud STT est replié dans la PR de routage global ; le retrait du registre STT legacy (utilitaires de chemins) reste fork-local, réglé à l'assemblage.
- Fichiers catalogue générés (règles compat compilées, catalogue modèles) : conflits résolus par le script de fix catalogue dédié — jamais à la main, jamais par régénération (non déterministe, dépendante du réseau).
- Merge uniquement — aucun rebase des branches PR publiques ; commit d'assemblage au format `sync(omp): …`.

## Décisions de test

- Un bon test ici asserte un comportement observable externe, pas un détail d'implémentation : le transcript de la touche globale atterrit dans le champ focus (champ principal, ask, extension editor, overlays, ET follow-up `/btw`) ; le maintenir-Espace déclenche la dictée dans le champ principal et le follow-up `/btw` ; la transcription passe par le backend Codex ; les previews de dictation restent dans la value du champ (flux : aperçu volatil ; one-shot : texte en bloc à l'arrêt) ; l'icône micro apparaît au curseur du champ récepteur pendant l'enregistrement, mono-lignes incluses ; les plages de lignes des file-mentions continuent de résoudre.
- Suite standard hors compilation Rust : sur chaque branche PR resyncée (avant fusion dans kml93) et sur l'assemblage kml93 — porte de types du monorepo + suite de tests JS standard. Pas de compilation Rust dans ce sync.
- Prior art : suite STT existante du paquet coding-agent (contrôleur, déclencheur de soumission, cloud, préflight), tests TUI existants (focus des overlays, dialogues ask, éditeur), tests de plages de lignes des file-mentions de la PR #10623, précédent d'utilisation du fix catalogue dans le workflow fork.
- La passe de dictée en TUI réel après assemblage est explicitement la responsabilité du mainteneur, pas de l'agent (test manuel : champ principal, follow-up `/btw`, prompts ask).

## Hors périmètre

- Remplacement ou retrait du geste maintenir-Espace d'amont (intouchable — décision mainteneur, confirmée).
- Rebase des PRs publiques (merge uniquement).
- Resync des autres branches fork (approval-hotkeys, ide-edit-approval…) : non concernées par les conflits.
- Nouvelles fonctionnalités STT au-delà de la réconciliation et de l'extension de la touche aux champs mono-lignes ; retravail du backend de transcription amont.
- Décision de merge des PRs côté amont (can1357) ; suivi de upstream-pi.
- Compilation Rust dans la vérification ; passe TUI manuelle (mainteneur).
- Mise à jour du changelog (interdite sauf demande explicite).

## Notes complémentaires

- Écart au handoff : 242 commits, `main` = `6204b75080`, kml93 = `14e93bdce7`. Depuis : 38 commits amont de plus (tip `ba344f5e69`), aucun ne touchant les zones en conflit (grep vide sur STT/mode interactif/utilitaires de chemins/catalogue) ; le checkout primaire a avancé d'un commit de chore (réorg du dossier tracker), sans impact.
- 6 fichiers en conflit répartis sur 3 PRs amont OPEN, mergées en avance dans kml93 : catalogue généré ×2 + test cloud STT (PR backend) ; mode interactif + contrôleur STT (PR routage) ; utilitaires de chemins (PR file-mentions).
- Course de vitesse STT : base de la PR routage = 2026-09-24 (`ef1ea204bc`) ; le commit d'amont dotant les champs mono-lignes de la surface de dictée (`9e479ac12f`, 2026-09-23, mergé dans main après la base) n'y est pas contenu — les deux travaux se sont croisés sans coordination, ce qui explique à la fois les conflits et l'extension réalisable au sync.
- Mécanique du routeur (confirmée dans le code) : l'ancien câblage de `app.stt.toggle` ne visait que le champ principal ; la PR le remplace par un écouteur global + résolution du champ texte focus déclaré (fallback : brouillon du champ principal avec message de statut), avec déclaration par panneau (ask, advisors, agents hub, plan review, hook editor… câblés dans la PR).
- Fonctionnement `/btw` (confirmé dans le code) : question annexe éphémère (réponse brève, sans outils, hors historique principal) ; `/btw` vide ouvre le hub BTW History ; follow-up (touche `f`, éditeur vide) ouvre un champ mono-ligne dans le hub — c'est ce champ que le commit d'amont câble au maintenir-Espace et que la resync déclarera au routeur.
- L'issue #2 est actuellement OPEN avec le label `ready-for-agent` ; le lien vers la PR de routage global reste à matérialiser.
- Vocabulaire (champ multi-lignes/mono-ligne, dictée, amont) consigné dans `.agents/CONTEXT.md`.
- Procédure de référence : guide de synchronisation du workflow fork (resync des PRs en vol, fix catalogue scripté).

Cible : branches fork locales + assemblage kml93 ; issue strictement fork-local (kml93/oh-my-pi).
