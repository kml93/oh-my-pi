# Repository Directives & Scope

## Goal & Mission
- Custom fork based on `can1357/oh-my-pi` (`omp`), selectively re-integrating valuable features and tools removed or adapted from `earendil-works/pi` (`pi`).
- Maintain seamless long-term upgradability with both upstream `omp` and upstream `pi`.

## Architectural Directives
- **Base**: `omp` engine and architecture remain the foundational core.
- **Native Porting**: Ported `pi` features are integrated directly into `omp`'s modular structure (under `packages/coding-agent/src/`, `packages/tui/`, etc.) rather than artificial wrapper layers.
- **Language & Runtime**: Follow `omp` TypeScript and Rust performance guidelines (strict typing, ES `#private`, Bun APIs).
- **Execution Target**: Primary CLI binary is `omp` (`packages/coding-agent/src/cli.ts`).

## Lifecycle & Git Operations
- For all branch management, commit formats, upstream synchronization, and PR creation, follow the project skill: `skill://fork-workflow`.
