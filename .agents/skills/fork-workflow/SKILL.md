---
name: fork-workflow
description: Use before any task that may create a commit or PR, including conditional bug investigations, and for branch choice, upstream sync, ports, merges, or running/testing omp locally. Load before inspecting or editing when a PR is possible.
---

# Dual-Upstream Fork Workflow (`oh-my-pi` + `pi`)

Operational procedures for maintaining `kml93/oh-my-pi`, a live fork based on `can1357/oh-my-pi` with selective feature ports from `earendil-works/pi`.

## Decision Tree

Destination determines the base: upstream OMP work starts from `main`; fork-local work starts from `kml93`. Keep the primary checkout on `kml93`.

```text
What is the intended result?
├─ Read-only inspection → No branch or worktree.
├─ PR to can1357/oh-my-pi → `omp/pr--<name>` worktree from current `main`.
│  └─ PR only if a bug is confirmed? Investigate read-only first.
│     ├─ Not confirmed → Report; stop unchanged.
│     └─ Confirmed → Create the worktree before the first edit.
├─ Selective port from earendil-works/pi → `pi/port--<name>` worktree from `kml93`.
├─ Durable fork-local change → `local/mod--<name>` worktree from `kml93`.
├─ Upstream synchronization → Follow `references/sync.md`.
└─ Trivial fork-local change → MAY edit `kml93` directly.
```

Uncertain whether a change is trivial? Use `local/mod--<name>`. Every non-trivial change MUST use a dedicated worktree.

Read the matching procedure before changing repository state:

- OMP PR → `references/pr-workflow.md`
- PI port → `references/porting.md`
- OMP/PI synchronization → `references/sync.md`
- Running or testing another branch → `references/runtime.md`
- Head-scoped PR review feedback → run `scripts/pr-feedback.ts <pr-number>` from the skill root (see `--help`)

## Remotes Architecture

```text
upstream-omp (https://github.com/can1357/oh-my-pi.git)   [Read-only, official omp]
upstream-pi  (https://github.com/earendil-works/pi.git)    [Read-only, official pi]
origin       (git@github.com:kml93/oh-my-pi.git)          [Read/Write, your GitHub]
```

## Branch Roles

- **`main`**: Exact mirror of `upstream-omp/main`; base only for upstream OMP PRs.
- **`kml93`**: Primary runtime branch; fork base containing custom changes and selected PI ports.
- **`omp/pr--<name>`**: Upstream OMP PR, based on `main`.
- **`pi/port--<name>`**: Selected PI port, based on `kml93`.
- **`local/mod--<name>`**: Durable fork-local change, based on `kml93`.
- **`omp/sync--<version>`**: Non-trivial integration of updated `main` into `kml93`.

## Commit Conventions

Format: `<type>(<scope>): <short imperative description>`

- `port(pi): <desc>`: Port or adaptation from PI.
- `fix(omp): <desc>`: OMP core bug fix.
- `feat(custom): <desc>`: Fork-local capability.
- `sync(omp): <desc>`: OMP upstream integration.
- `sync(pi): <desc>`: Selected PI fix synchronization.
- `refactor(<scope>): <desc>`: Internal reorganization.
- `chore: <desc>`: Tooling or environment change.

## Invariants

- NEVER commit custom work to `main`; keep fast-forward synchronization possible.
- NEVER merge `upstream-pi/main`; inspect and port selected changes.
- Verify runtime after every merge with the applicable smoke command.

Dev runtime setup uses `scripts/setup-minimum-runtime-dev.sh`.
