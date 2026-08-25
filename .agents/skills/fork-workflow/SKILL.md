---
name: fork-workflow
description: Procedures and standards for maintaining this dual-upstream repository, synchronizing omp and pi, managing branches, opening upstream PRs, and porting features.
---

# Dual-Upstream Fork Workflow (`oh-my-pi` + `pi`)

Operational manual for maintaining `kml93/oh-my-pi`, a live fork based on `can1357/oh-my-pi` with selective feature ports from `earendil-works/pi`.

## Remotes Architecture

```text
upstream-omp (https://github.com/can1357/oh-my-pi.git)   [Read-only, official omp]
upstream-pi  (https://github.com/earendil-works/pi.git)    [Read-only, official pi]
origin       (git@github.com:kml93/oh-my-pi.git)          [Read/Write, your GitHub]
```

## Branch Strategy

- **`main`**: Pure 1:1 mirror of `upstream-omp/main`. Never commit custom code directly to `main`. Used exclusively to pull upstream updates and branch clean PRs.
- **`kml93`**: Primary working/production branch. Contains `omp` base + custom configurations + ported `pi` features.
- **Temporary branches (Style B)**:
  - `pi:port--<feature-name>` : Temporary branch for porting a module from `pi`.
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
 │    └── See `references/porting.md`.
 │
 ├── 2. Upstream PR for official OMP
 │    └── From `main` (clean) ➔ branch `omp:pr--<name>` ➔ commit ➔ push & open PR on GitHub.
 │    └── Merge `omp:pr--<name>` into `kml93` to use immediately without waiting for upstream merge.
 │    └── See `references/pr-workflow.md`.
 │
 ├── 3. Upstream OMP update available
 │    └── Checkout `main` ➔ `git merge upstream-omp/main` ➔ push to `origin/main`.
 │    └── Checkout `kml93` ➔ `git merge main` ➔ test ➔ push to `origin/kml93`.
 │    └── See `references/sync.md`.
 │
 └── 4. Inspecting PI updates
      └── `git fetch upstream-pi` ➔ review incoming log ➔ cherry-pick/port selectively.
      └── See `references/sync.md`.
```

## Local Development & Testing

- **Binary name**: `omp` (`packages/coding-agent/src/cli.ts`).
- **Live testing with Bun**:
  ```bash
  cd packages/coding-agent && bun link
  bun link @oh-my-pi/pi-coding-agent
  ```
- **Smoke test command**:
  ```bash
  bun packages/coding-agent/src/cli.ts --version
  ```

## Reference Guides

- `references/sync.md`: Step-by-step upstream synchronization commands and conflict resolution.
- `references/porting.md`: Rules and patterns for importing code from `pi` into `omp`.
- `references/pr-workflow.md`: Clean PR creation and lifecycle towards `can1357/oh-my-pi`.
