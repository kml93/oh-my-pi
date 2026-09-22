# Chantier sync kml93 ← main v18.2.8 — Plan global

Un ticket = une session `omp` séparée. Ordre : T1 et T3 **en parallèle possible**
(worktrees distincts), puis T4 (assemblage, un seul opérateur, après T1 et T3),
puis T5 (vérification + push, après review manuelle de kml93). **T2 est ANNULÉE.**

## État de départ (vérifié le 2026-09-22, mis à jour pour la v2 STT)

- Repo : `/home/kml93/.config/local/opt/kml93@oh-my-pi`
- `main` local = `fd3f8e3c56` (v18.2.8) — **déjà fetché**, miroir **pas encore
  poussé** sur origin (se fait en T5).
- `kml93` propre. Worktree/branche `omp/sync--v18.2.4` déjà supprimés.

## Branches PR sur origin (état vs main)

| Branche | État | Ticket |
|---|---|---|
| `omp/pr--file-mention-ranges` | 8 commits en vol, tip `daeae708cf` | T1 |
| `omp/pr--approval-hotkeys` | 1 commit en vol, `de058648cf` | T3 |
| `omp/pr--openai-codex-stt-v2` | 1 commit **déjà posé sur main** `0f72e88521` | intégré en T4, rien à synchroniser |
| `omp/pr--openai-codex-stt` | **obsolète** (remplacée par la v2) | T2 ANNULÉE |
| `omp/pr--at-dir-completion` | acceptée upstream, obsolète | — |
| `omp/pr--ide-edit-approval` | 15 commits, sans conflit dans ce sync | hors périmètre |
| `omp/pr--fix-package-json-indent` | 1 commit, sans conflit (`package.json`) | hors périmètre |

## Tickets

- `T1-file-mention-ranges.md` — sync PR sélecteurs de lignes
- `T2-openai-codex-stt.md` — **ANNULÉE** (v2 déjà sur main ; STT traité en T4)
- `T3-approval-hotkeys.md` — sync PR raccourcis approval (migration vers pi-tui)
- `T4-assemblage-kml93.md` — merge main + branches dans kml93 (après T1 et T3)
- `T5-verification-push.md` — setup, smoke test, review, push (après T4 + review)

## Restes sans PR (éditions directes kml93, traitées en T4)

- `packages/coding-agent/src/prompts/tools/ask.md` : version fork enrichie à
  combiner avec le bullet upstream « Other = clarifying question ».

## Règles transverses (dans chaque ticket)

Skills à charger en premier, jamais de push, jamais de GitHub, jamais toucher
`kml93`/`main` (sauf T4, assemblage), tests ciblés seulement, stop & rapport si
intentions incompatibles. Push uniquement en T5 après review manuelle.
