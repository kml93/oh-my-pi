# Handoff — Sync kml93 ← main

Décisions prises avec kml93 le 2026-09-25 — à prendre telles quelles.

## Problème

Mettre à jour `kml93` avec `main` (main = `6204b75080`, kml93 = `14e93bdce7`, 242 commits d'écart). Le merge direct conflit sur 6 fichiers, causés par 3 PRs fork encore OPEN en amont (can1357), mergées en avance dans kml93.

## Décisions

1. **Resync les branches PR d'abord, jamais résoudre dans kml93.** Ordre : #12853 puis #13169 (chevauchement stt-controller) ; #10623 parallélisable. Puis assemblage kml93 (main d'abord, puis chaque branche), vérification, et push en dernier : branches PR puis kml93.
2. **Réconciliation sémantique STT** : main a mergé son propre STT — `9e479ac12f` push-to-talk ciblé /btw, `94c53a7355` previews dictation dans la value. La PR #13169 (routage global via InputController, spec issue #2) doit être réimplémentée sur la structure refactorée, en tranchant la redondance avec le push-to-talk ciblé — sans supprimer le fix amont silencieusement, redondance documentée dans la PR.
3. **Attribution des refactors** : c'est MAIN qui a réécrit `interactive-mode.ts` (settings-registry/internal-URLs : `6962d5cd2e`, `c4a2441d8f`, `862b876293`) et `path-utils.ts` (`7dc2ef905e`), pas les PRs fork.
4. **Issue #2** (spec STT v2, fermée trop tôt) : à rouvrir et lier à la PR #13169 ; fermeture le jour où les PRs sont mergées upstream.
5. **Fixups kml93-only** : `ba932740ee` (signature toggle stt-cloud.test) → replier dans #13169 ; `f8948a7ef0` (drop registre STT legacy path-utils) → fork-local, réglé à l'assemblage.

## Conflits attendus par branche

- `omp/pr--openai-codex-stt-v2` (#12853, tip `0a24936f44`) : `rules.json`, `models.json`, `stt-cloud.test.ts`
- `omp/pr--global-stt-focus` (#13169, tip `cfd72f9fad`) : `interactive-mode.ts`, `stt-controller.ts`
- `omp/pr--file-mention-ranges` (#10623, tip `639916d4ba`) : `path-utils.ts`
- Assemblage kml93 : les 6 + conflits croisés stt entre les deux PRs STT (routage → 13169 gagne ; backend transcription → 12853 gagne)

## État physique

3 worktrees déjà créés, merge `main --no-commit --no-ff` DÉJÀ lancé (conflits en place, MERGE_HEAD posé — reprendre, ne pas relancer) :
`.worktrees/omp-pr--{openai-codex-stt-v2,global-stt-focus,file-mention-ranges}`

Procédure de référence : skill `fork-workflow` (`skill://fork-workflow/references/sync.md`).

## Out of scope

- Pas de rebase des PRs publiques (merge uniquement).
- Pas de resync des autres branches (approval-hotkeys, ide-edit-approval…) : non concernées par les conflits.
