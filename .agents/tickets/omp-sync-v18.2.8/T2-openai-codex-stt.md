# Ticket T2 — ANNULÉ : `omp/pr--openai-codex-stt` remplacée par la v2

## Statut

ANNULÉ (2026-09-22). L'architecture STT fork (`stt/transcriber-registry.ts`,
`stt/types.ts`, `stt/local/`, `stt/providers/`, réglage `stt.transcriber`) est
dépassée : upstream a refait le STT (`packages/ai/src/transcription/`, `stt/`
nettoyé, réglage `stt.modelName`), et la PR de remplacement
`omp/pr--openai-codex-stt-v2` (tip `0f72e88521`, 1 commit) est posée
**directement sur main `fd3f8e3c56`** — rien à synchroniser, aucun travail ici.

## Ce qui est reporté en T4

- Ne PAS préserver l'ancienne archi fork : à l'assemblage, prendre les versions
  main pour tout le périmètre STT (procédure détaillée en T4).
- L'ancienne branche `omp/pr--openai-codex-stt` devient obsolète — ne pas la
  supprimer sans accord explicite (action GitHub).
