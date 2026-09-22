# Ticket T4 — Assemblage : merge main + branches PR synchronisées dans kml93

## Prérequis

T1 (file-mention-ranges) et T3 (approval-hotkeys) terminés. T2 est ANNULÉE
(remplacée par `omp/pr--openai-codex-stt-v2`, déjà posée sur main — rien à
synchroniser). À lancer SEUL, après T1 et T3.

## Contexte

- Repo : `/home/kml93/.config/local/opt/kml93@oh-my-pi`. Travail **dans le checkout
  principal**, branché sur `kml93`. Vérifier `git status` propre avant de commencer.
- C'est la procédure du commit historique `28b35d6ea7` (sync + PR synchronisée).

## Procédure

1. Charger : `.agents/skills/fork-workflow/SKILL.md` + `references/sync.md` et
   `/home/kml93/.agents/skills/matt-pocock/resolving-merge-conflicts/SKILL.md`.
2. `git merge main` dans le checkout principal (kml93). Résolution par attribution :

   **a) Fichiers des PRs T1/T3 — reprendre les versions corrigées :**
   ```bash
   git checkout omp/pr--file-mention-ranges -- packages/coding-agent/src/utils/file-mentions.ts
   git checkout omp/pr--approval-hotkeys -- packages/tui/src/prompt/custom-editor.ts packages/tui/test/custom-editor-keybindings.test.ts packages/coding-agent/src/tools/approval.ts packages/coding-agent/test/tools/approval.test.ts
   ```

   **b) Périmètre STT — prendre main, NE PAS préserver l'ancienne archi fork**
   (remplacée par la v2 basée sur main). Conflits modify/delete attendus sur :
   `stt/transcriber-registry.ts`, `stt/types.ts`, `stt/contracts.ts`,
   `stt/batch-wav-recorder.ts`, `stt/local/`, `stt/providers/` → accepter les
   suppressions (`git rm`). Pour `stt/index.ts`, `stt/models.ts`,
   `stt/stt-controller.ts`, `config/settings-schema.ts`, `config/settings.ts`,
   `cli/setup-cli.ts`, `modes/acp/acp-agent.ts` : prendre le côté main pour le
   vocabulaire STT (`stt.modelName`, backend `packages/ai/src/transcription/`),
   en gardant les éventuelles autres modifs fork non-STT de ces fichiers.
   Après résolution, vérifier qu'aucune référence morte ne reste :
   ```bash
   git grep -nE 'transcriber-registry|STT_TRANSCRIBER|DEFAULT_STT_TRANSCRIBER|stt\.transcriber' -- packages || echo OK
   ```
   Note : un ancien réglage utilisateur `stt.transcriber` dans le settings.json
   devient inconnu du schéma (ignoré/averti par main) — acceptable, à mentionner
   dans le rapport.

   **c) Suppression directe :** `git rm packages/coding-agent/src/cli/setup-model-picker.ts`
   (fonction déplacée vers `@oh-my-pi/pi-tui/apps/setup-model-picker`).

   **d) `packages/coding-agent/src/prompts/tools/ask.md`** (édition directe kml93,
   sans PR) : **combiner à la main** — garder les 5 bullets fork (Necessary
   context, Option design, Objective recommendations, Multi-question batching,
   Adaptive rounds) + ajouter le bullet upstream sur « Other » = clarifying
   question (répondre en texte puis re-`ask`).

   **e) Reste** (CHANGELOGs, imports divers) : fusion automatique normalement ;
   sinon préserver les deux intentions.

3. Commit merge : `sync(omp): merge main into kml93 (v18.2.8)`.
4. Merger les branches, une par une :
   ```bash
   git merge omp/pr--file-mention-ranges
   git merge omp/pr--approval-hotkeys
   git merge origin/omp/pr--openai-codex-stt-v2   # 1 commit sur main, merge trivial
   ```
   Conflits résiduels : les contenus doivent converger — vérifier, ne pas réécrire.
5. Hunk insoluble → STOP + rapport. Ne rien pusher ici.

## Tests

```bash
scripts/setup-minimum-runtime-dev.sh
omp --smoke-test
bun check
bun test packages/coding-agent/test/stt-cloud.test.ts packages/ai/test/openai-codex-transcriptions.test.ts
```

## Livrable

kml93 contient main v18.2.8 + features T1/T3 + STT v2 (archi transcription
upstream) + ask.md combiné. Rapport : chemins pris par fichier, résultat du
grep anti-références-mortes, conflits résiduels, résultats smoke/check.
Ensuite review manuelle de kml93 → T5.
