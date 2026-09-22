# Chantier sync kml93 ← main v18.2.8 — Plan global

Un ticket = une session `omp` séparée. Ordre : T1, T2, T3 **en parallèle possible**
(worktrees distincts), puis T4 (assemblage, un seul opérateur, après T1–T3),
puis T5 (vérification + push, après review manuelle de kml93).

## État de départ (vérifié le 2026-09-22)

- Repo : `/home/kml93/.config/local/opt/kml93@oh-my-pi`
- `main` local = `fd3f8e3c56` (v18.2.8, +172 commits vs v18.2.4) — **déjà fetché**,
  miroir **pas encore poussé** sur origin (se fait en T5).
- `kml93` = `3fa6c2e0c6` (sync v18.1.15), arbre propre, checkout principal.
- Worktree obsolète à jeter avant tout (merge avorté en conflit, rien de résolu dedans) :
  ```bash
  git worktree remove --force .worktrees/omp-sync--v18.2.4
  git branch -D omp/sync--v18.2.4
  ```

## Branches PR sur origin (état vs main)

| Branche | En vol | Tip | Ticket |
|---|---|---|---|
| `omp/pr--file-mention-ranges` | 8 | `daeae708cf` (2026-09-08) | T1 |
| `omp/pr--openai-codex-stt` | 11 | `f02e334b4d` (2026-09-08) | T2 |
| `omp/pr--approval-hotkeys` | 1 | `de058648cf` (2026-08-26) | T3 |
| `omp/pr--at-dir-completion` | 0 | — acceptée upstream, obsolète | — |
| `omp/pr--ide-edit-approval` | 15 | sans conflit dans ce sync | hors périmètre |
| `omp/pr--fix-package-json-indent` | 1 | sans conflit (`package.json` seul) | hors périmètre |

## Tickets

- `T1-file-mention-ranges.md` — sync PR sélecteurs de lignes
- `T2-openai-codex-stt.md` — sync PR STT registry + Codex
- `T3-approval-hotkeys.md` — sync PR raccourcis approval (migration vers pi-tui)
- `T4-assemblage-kml93.md` — merge main + branches dans kml93 (après T1–T3)
- `T5-verification-push.md` — setup, smoke test, review, push (après T4 + review manuelle)

## Restes sans PR (éditions directes kml93, traitées en T4)

- `packages/coding-agent/src/prompts/tools/ask.md` : version fork enrichie à combiner
  avec le bullet upstream « Other = clarifying question ».

## Règles transverses (dans chaque ticket)

Skills à charger en premier, jamais de push, jamais de GitHub, jamais toucher
`kml93`/`main`, tests ciblés seulement, stop & rapport si intentions incompatibles.
Push uniqument en T5 après review manuelle.
