# Ticket T1 — Synchroniser `omp/pr--file-mention-ranges` avec main

## Contexte

- Repo : `/home/kml93/.config/local/opt/kml93@oh-my-pi` (checkout principal sur `kml93`, ne pas y travailler).
- `main` = `fd3f8e3c56` (v18.2.8). Branche PR `origin/omp/pr--file-mention-ranges` tip `daeae708cf`, dernière sync main le 2026-09-08 (base v18.1.14).
- La PR ajoute les **sélecteurs de lignes** aux @mentions : `@file.ts:2-3,5`, tails `:N`,
  chemins quotés avec sélecteur (`@"My Folder/app.ts":10-20`), snapshots hashline
  (`EditStore`, `recordSnapshot`, `seenLines`). Tests de référence :
  `packages/coding-agent/test/file-mentions.test.ts` (les garder verts est le contrat).
- Entre-temps upstream a **déplacé des helpers vers `@oh-my-pi/pi-tui`** :
  `hashline-format` → `@oh-my-pi/pi-tui/tools/hashline-format`,
  `streaming-output` → `@oh-my-pi/pi-tui/tools/streaming-output`,
  la vidéo (une partie) → `@oh-my-pi/pi-tui/prompt/video` (`isVideoPath`,
  `createVideoPreviewImage`) ; `packages/coding-agent/src/utils/video.ts` existe
  toujours pour le reste (`probeVideo`, `buildVideoContactSheetPng`, etc.).

## Procédure

1. Charger : `.agents/skills/fork-workflow/SKILL.md` (+ `references/sync.md`,
   section « Conflicts Originating from an In-Flight PR ») et
   `/home/kml93/.agents/skills/matt-pocock/resolving-merge-conflicts/SKILL.md`.
2. Worktree :
   ```bash
   git worktree add --track -b omp/pr--file-mention-ranges .worktrees/pr--file-mention-ranges origin/omp/pr--file-mention-ranges
   cd .worktrees/pr--file-mention-ranges
   bun install
   ```
3. `git merge main` — résoudre les conflits (attendus surtout dans
   `packages/coding-agent/src/utils/file-mentions.ts`).
4. Résolution : **préserver la feature sélecteurs fork**, adapter uniquement les
   chemins d'import vers `@oh-my-pi/pi-tui/...`. Ne pas réécrire la logique,
   ne pas adopter la version amont simplifiée (elle n'a pas les sélecteurs).
   Upstream a aussi une résolution plus stricte (`resolveMentionPath`, exact-match
   uniquement) : garder la résolution fork (`resolveMention` avec sélecteurs) qui
   est un sur-ensemble.
5. Si un hunk ne peut pas être résolu en préservant les deux intentions :
   **STOP, ne pas inventer** — écrire un rapport du point bloquant et s'arrêter.
6. `bun run fix` si le merge déforme le formatage, puis committer le merge
   (`Merge branch 'main' into omp/pr--file-mention-ranges`).

## Tests (à la fin, dans le worktree)

```bash
bun check
bun test packages/coding-agent/test/file-mentions.test.ts packages/tui/test/autocomplete.test.ts
```
Smoke optionnel (recette `references/runtime.md`) :
`bun install --production --filter @oh-my-pi/pi-coding-agent && bun run gen:tool-views`,
lien dur des `.node` depuis le checkout principal, `sh packages/coding-agent/scripts/omp --smoke-test`.

## Garde-fous

- Aucun push, aucune action GitHub, ne pas toucher à `kml93`, `main` ou aux autres worktrees.
- Pas de suites complètes du projet ; tests ciblés uniquement.

## Livrable

Branche `omp/pr--file-mention-ranges` synchronisée (merge commit) dans
`.worktrees/pr--file-mention-ranges`, tests verts. Rapport : fichiers résolus,
décisions prises, HEAD final, résultats des tests.
