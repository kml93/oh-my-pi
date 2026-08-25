---
name: fork-workflow
description: Apply git branch conventions, commit formatting, PR creation, or upstream sync rules. Use ONLY when ready to commit changes, create/switch branches, open upstream PRs, or synchronize upstream-omp and upstream-pi remotes. Never use during code research.
---

# Dual-Upstream Fork Workflow (`oh-my-pi` + `pi`)

Operational procedures for maintaining `kml93/oh-my-pi`, a live fork based on `can1357/oh-my-pi` with selective feature ports from `earendil-works/pi`.

## Remotes Architecture

```text
upstream-omp (https://github.com/can1357/oh-my-pi.git)   [Read-only, official omp]
upstream-pi  (https://github.com/earendil-works/pi.git)    [Read-only, official pi]
origin       (git@github.com:kml93/oh-my-pi.git)          [Read/Write, your GitHub]
```

## Branch Roles & Conventions

- **`main`**: Pure 1:1 mirror of `upstream-omp/main`. Never commit custom code directly to `main`. Used exclusively to pull upstream updates and branch clean PRs.
- **`kml93`**: Primary working branch. Contains `omp` base + custom configurations + ported `pi` features.
- **Temporary branches (Style B)**:
  - `pi:port--<feature-name>` : Porting an isolated module from `pi`.
  - `omp:pr--<fix-name>` : Clean branch created from `main` to propose PRs to `upstream-omp`.
  - `local:mod--<change-name>` : Personal custom adjustments.
  - `omp:sync--<version>` : Experimental synchronization branch for complex upstream merges.

## Commit Conventions (Extended Conventional Commits)

Format: `<type>(<scope>): <short imperative description>`

- `port(pi): <desc>` : Porting or adapting a feature/module from `pi`.
- `fix(omp): <desc>` : Bug fix in `omp` core.
- `feat(custom): <desc>` : New personal capability or tweak.
- `sync(omp): <desc>` : Merging upstream `omp` updates.
- `sync(pi): <desc>` : Cherry-picking or syncing fixes from `pi`.
- `refactor(<scope>): <desc>` : Internal reorganization.
- `chore: <desc>` : Tooling, build, bun link, or dev environment changes.

## Decision Matrix

```text
Task Intent
 ├── 1. Porting a feature from PI
 │    └── From `kml93` ➔ branch `pi:port--<name>` ➔ test ➔ merge into `kml93` ➔ delete branch.
 │    └── Trigger: Read `references/porting.md` for architectural mapping and porting patterns.
 │
 ├── 2. Upstream PR for official OMP
 │    └── From `main` (clean) ➔ branch `omp:pr--<name>` ➔ commit ➔ push & open PR on GitHub.
 │    └── Merge `omp:pr--<name>` into `kml93` to use immediately without waiting for upstream merge.
 │    └── Trigger: Read `references/pr-workflow.md` for PR lifecycle instructions.
 │
 ├── 3. Upstream OMP update available
 │    └── Checkout `main` ➔ `git merge upstream-omp/main --ff-only` ➔ push to `origin/main`.
 │    └── Checkout `kml93` ➔ `git merge main` ➔ test ➔ push to `origin/kml93`.
 │    └── Trigger: Read `references/sync.md` for conflict resolution and merge steps.
 │
 └── 4. Inspecting PI updates
      └── `git fetch upstream-pi` ➔ review incoming log ➔ cherry-pick/port selectively.
      └── Trigger: Read `references/sync.md` for selective tracking.
```

## Gotchas

- **Never commit directly to `main`**: Any custom commit on `main` breaks fast-forward synchronization with `upstream-omp`.
- **Never merge entire `upstream-pi/main`**: Full 3-way merge from `pi` will produce thousands of structural file conflicts because `omp` refactored the entire codebase into Rust native extensions and 58 modular directories.
- **Always verify runtime after merges**: Run `bun packages/coding-agent/src/cli.ts --version` to ensure native bindings and TypeScript types remain sound.

## Local Runtime Execution

- **Binary name**: `omp` (`packages/coding-agent/src/cli.ts`).
- **Live development with Bun**:
  ```bash
  cd packages/coding-agent && bun link
  bun link @oh-my-pi/pi-coding-agent
  ```
