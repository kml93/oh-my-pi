# Namespaces pour Prompts & Slash Commands (`/prompt:`, `/cmd:`)

Statut : Idée DORMANTE (fork-local kml93, 2026-09-03)
Auteur : kml93
Contexte : Inspiré par `~/.config/pi/extensions/session_start/prompts/`

## Problème

Dans l'upstream d'OMP, les slash commands et les prompt templates partagent un espace de noms plat sous `/<nom>` :
- Quand deux fichiers portent le même nom (ex: `.claude/commands/test.md` et `.omp/prompts/test.md`), OMP résout silencieusement le conflit par priorité de fournisseur (`Projet > Utilisateur > Claude > Codex`).
- L'élément perdant est marqué `_shadowed = true` et devient inaccessible dans le prompt interactif.
- L'utilisateur ne peut pas cibler explicitement un template de prompt plutôt qu'un script de commande lors de l'invocation.

L'upstream d'OMP (`can1357`) maintient délibérément ce comportement plat "first-wins" pour une parité 1:1 stricte avec Claude Code et OpenAI Codex. Par conséquent, l'ajout de namespaces explicites est une fonctionnalité propre au fork `kml93`.

## Proposition

Introduire des préfixes de namespace explicites et une désambiguïsation de collisions sur la branche `kml93` :
1. `/prompt:<nom> [args]` : Cible et développe directement un prompt template (`expandPromptTemplate`), sans passer par les commandes.
2. `/cmd:<nom> [args]` (ou `/command:<nom>`) : Cible et exécute directement une slash command fichier (`expandSlashCommand`).
3. Syntaxe de désambiguïsation `<namespace>:<nom>` dans l'autocomplétion quand des noms en doublon existent entre plusieurs sources (`user:`, `project:`, `claude:`, `codex:`).

## Sémantique & Portée

- Les commandes plates (`/test`) continuent de fonctionner à l'identique pour assurer la rétrocompatibilité.
- Les commandes préfixées (`/prompt:test`, `/cmd:test`) agissent comme des surcharges de désambiguïsation explicites.
- Dans l'autocomplétion TUI, taper `/prompt:` filtre les suggestions pour n'afficher que les templates de prompts (sur le même modèle que l'autocomplétion de `/skill:` dans OMP).

## Notes d'implémentation (~150-250 lignes)

### 1. Interception de saisie (`packages/coding-agent/src/session/agent-session.ts`)
- Le parseur générique `parseSlashCommand` d'OMP découpe sur le caractère `:` (interprétant `/foo:bar` comme la commande `foo` avec l'argument `bar`).
- Intercepter en amont du parsing générique :
  - Si `text.startsWith("/prompt:")` : extraire le nom et les arguments, puis appeler `expandPromptTemplate`.
  - Si `text.startsWith("/cmd:")` ou `text.startsWith("/command:")` : extraire le nom et les arguments, puis appeler `expandSlashCommand`.

### 2. Suggestions d'autocomplétion (`packages/coding-agent/src/modes/interactive-mode.ts`)
- Enregistrer les entrées virtuelles `/prompt:<nom>` et `/cmd:<nom>` dans `#pendingSlashCommands`.
- Pour les éléments en doublon (`_shadowed = true` dans `capability/index.ts`), exposer les variantes qualifiées par leur source (ex: `/prompt:user:<nom>` vs `/prompt:project:<nom>`).

### 3. Implémentations de référence
- Extension Pi : `~/.config/pi/extensions/session_start/prompts/` (`namespace.ts`, `autocomplete.ts`).
- Gestion de la commande skill dans OMP : `packages/coding-agent/src/modes/skill-command.ts`.
