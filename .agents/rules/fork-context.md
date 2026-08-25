---
description: Dual-upstream fork identity, mission, and architectural directives.
alwaysApply: true
---

# Dual-Upstream Fork Context

## Mission & Architecture
- **Identity**: Live fork of `can1357/oh-my-pi` (`omp`) with selective feature ports from `earendil-works/pi` (`pi`).
- **Base**: `omp` architecture is the foundational core.
- **Native Porting**: Features from `pi` are ported directly into corresponding `omp` modules (`packages/coding-agent/src/`, `packages/tui/`, etc.) — no wrapper shims.
- **CLI Binary**: `omp` (`packages/coding-agent/src/cli.ts`).

## Invariants & Operations
- **Working Branch**: `kml93` is the active branch. Never commit directly to `main` (reserved as clean upstream-omp mirror).
- **Git Operations**: For branch strategies (`pi:port--*`, `omp:pr--*`), commit formats (`port(pi):`, `fix(omp):`), upstream syncing, and PR workflows, follow `skill://fork-workflow`.
