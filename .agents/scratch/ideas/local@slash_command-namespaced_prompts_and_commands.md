# Namespaced Prompts & Slash Commands (`/prompt:`, `/cmd:`)

Status: DORMANT idea (fork-local kml93, 2026-09-03)
Owner: kml93
Context: Inspired by `~/.config/pi/extensions/session_start/prompts/`

## Problem

In OMP upstream, slash commands and prompt templates share a single flat namespace under `/<name>`:
- When two files share the same name (e.g. `.claude/commands/test.md` and `.omp/prompts/test.md`), OMP silently resolves by provider priority (`Projet > Utilisateur > Claude > Codex`).
- The shadowed entry is marked `_shadowed = true` and becomes unreachable in the interactive prompt.
- The user cannot explicitly target a prompt template vs a command script when invoking.

Upstream OMP (`can1357`) intentionally maintains this flat, first-wins behavior for 1:1 parity with Claude Code and OpenAI Codex. Therefore, explicit namespacing is a fork-specific feature for `kml93`.

## Proposal

Introduce explicit namespace prefixes and collision disambiguation on the `kml93` branch:
1. `/prompt:<name> [args]` : Directly targets and expands a prompt template (`expandPromptTemplate`), bypassing slash commands.
2. `/cmd:<name> [args]` (or `/command:<name>`) : Directly targets and executes a file-based slash command (`expandSlashCommand`).
3. Disambiguation syntax `<namespace>:<name>` in autocomplete when duplicate names exist across sources (`user:`, `project:`, `claude:`, `codex:`).

## Semantics & Scope

- Flat commands (`/test`) continue to work unchanged for backwards compatibility.
- Prefixed commands (`/prompt:test`, `/cmd:test`) act as explicit disambiguation overrides.
- In TUI autocomplete, typing `/prompt:` filters suggestions to prompt templates only (mirroring the `/skill:` autocomplete behavior in OMP).

## Implementation Notes (~150-250 lines)

### 1. Input Interception (`packages/coding-agent/src/session/agent-session.ts`)
- OMP's generic `parseSlashCommand` splits on `:` (treating `/foo:bar` as command `foo` with arg `bar`).
- Intercept early before generic command parsing:
  - If `text.startsWith("/prompt:")`: extract name and args, call `expandPromptTemplate`.
  - If `text.startsWith("/cmd:")` or `text.startsWith("/command:")`: extract name and args, call `expandSlashCommand`.

### 2. Autocomplete Suggestions (`packages/coding-agent/src/modes/interactive-mode.ts`)
- Register `/prompt:<name>` and `/cmd:<name>` virtual entries in `#pendingSlashCommands`.
- For duplicate items (`_shadowed = true` in `capability/index.ts`), expose source-qualified items (e.g. `/prompt:user:<name>` vs `/prompt:project:<name>`).

### 3. Reference Implementations
- Pi extension: `~/.config/pi/extensions/session_start/prompts/` (`namespace.ts`, `autocomplete.ts`).
- OMP skill command handling: `packages/coding-agent/src/modes/skill-command.ts`.
