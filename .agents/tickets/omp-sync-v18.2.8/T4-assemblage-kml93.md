# Ticket T4 — Assemblage : merge main + branches PR synchronisées dans kml93

## Prérequis

T1, T2, T3 terminés : branches `omp/pr--file-mention-ranges`,
`omp/pr--openai-codex-stt`, `omp/pr--approval-hotkeys` synchronisées avec
main (`fd3f8e3c56`) dans leurs worktrees respectifs. À lancer SEUL, après eux.

## Contexte

- Repo : `/home/kml93/.config/local/opt/kml93@oh-my-pi`. Travail **dans le checkout
  principal**, branché sur `kml93` (`3fa6c2e0c6` avant le chantier). Vérifier
  `git status` propre avant de commencer.
- C'est la procédure du commit historique `28b35d6ea7` (sync + PR synchronisée).

## Procédure

1. Charger : `.agents/skills/fork-workflow/SKILL.md` + `references/sync.md` et
   `/home/kml93/.agents/skills/matt-pocock/resolving-merge-conflicts/SKILL.md`.
2. `git merge main` dans le checkout principal (kml93). Conflits attendus —
   résolution par attribution :
   - fichiers des PRs (`file-mentions.ts`, `settings-schema.ts`, `stt/*`,
     `custom-editor.ts` tui, `approval.ts`, tests éditeur/approval,
     `setup-model-picker.ts`) : reprendre la version des branches synchronisées :
     ```bash
     git checkout omp/pr--file-mention-ranges -- packages/coding-agent/src/utils/file-mentions.ts
     git checkout omp/pr--openai-codex-stt -- packages/coding-agent/src/config/settings-schema.ts packages/coding-agent/src/stt
     git checkout omp/pr--approval-hotkeys -- packages/tui/src/prompt/custom-editor.ts packages/tui/test/custom-editor-keybindings.test.ts packages/coding-agent/src/tools/approval.ts packages/coding-agent/test/tools/approval.test.ts
     git rm packages/coding-agent/src/cli/setup-model-picker.ts   # supprimé dans main
     ```
   - `packages/coding-agent/src/prompts/tools/ask.md` (édition directe kml93,
     sans PR) : **combiner à la main** — garder les 5 bullets fork (Necessary
     context, Option design, Objective recommendations, Multi-question batching,
     Adaptive rounds) + ajouter le bullet upstream sur « Other » = clarifying
     question (répondre en texte puis re-`ask`).
   - reste (CHANGELOGs, imports divers) : fusion automatique normalement ;
     sinon préserver les deux intentions.
3. Commit merge : `sync(omp): merge main into kml93 (v18.2.8)`.
4. Merger les 3 branches synchronisées dans kml93 (une par une) :
   `git merge omp/pr--file-mention-ranges`, etc. Conflits résiduels : les deux
   côtés doivent déjà converger (mêmes contenus) — vérifier, ne pas réécrire.
5. Hunk insoluble → STOP + rapport. Ne rien pusher ici.

## Tests

```bash
scripts/setup-minimum-runtime-dev.sh
omp --smoke-test
bun check
```

## Livrable

kml93 contient main v18.2.8 + les 3 features PR adaptées + ask.md combiné.
Rapport : chemins pris par fichier, conflits résiduels des merges de branches,
résultats smoke/check. Ensuite l'utilisateur review à la main → T5.
