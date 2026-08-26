---
name: fork-workflow
description: Branch strategy, commits, PRs, and dual-upstream sync. Use when starting a task to pick/create the right base branch, when committing or opening PRs, or when syncing upstream-omp and upstream-pi remotes.
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
- **Always verify runtime after merges**: Run `omp --smoke-test` (or `bun packages/coding-agent/src/cli.ts --version`) to ensure native bindings and TypeScript types remain sound.

## Local Runtime Execution

- **Binary**: `omp` (`packages/coding-agent/src/cli.ts`).
- **Dev machine (source-linked)**: `bun install --global ./packages/coding-agent`
  symlinks the workspace package into Bun's global tree, so the global `omp`
  runs this checkout's working tree — branch switches and uncommitted edits are
  live. `sh scripts/link-omp.sh` is the wrapper alternative (same effect).
  - Minimal deps (~312 MB, no Rust toolchain):
    `bun install --production --filter @oh-my-pi/pi-coding-agent`, then fetch
    the prebuilt addons pinned to the workspace natives version (same pattern
    as CI; the files live in gitignored `packages/natives/native/` and survive
    later installs — unlike a `--no-save` npm leaf, which is extraneous and
    gets purged, and whose bare name resolves to the stale lockfile pin):
    ```bash
    ver=$(bun -e "console.log(require('./packages/natives/package.json').version)")
    tb=$(npm view "@oh-my-pi/pi-natives-linux-x64@$ver" dist.tarball)
    tmp=$(mktemp -d) && curl -fsSL --retry 3 "$tb" | tar -xz -C "$tmp"
    cp "$tmp/package/"pi_natives.*.node packages/natives/native/
    ```
    Exact version match is enforced at load time (version sentinel) — a
    mismatched addon makes `omp --smoke-test` fail before a session starts.
  - Moving or deleting the checkout breaks `omp` (symlink chain); re-run the
    global install from the new path.
  - Never install the dist build globally on a dev machine — it overwrites the
    source link. Dev machines = source link, usage machines = dist.
  - Probe before a session: `omp --smoke-test`.
- **Usage machines (dist, no repo)**: rolling prerelease `dist` on the fork,
  rebuilt on every push to `kml93` (`.github/workflows/dist-release.yml`; the
  npm natives leaf is fetched and embedded in the ELF — nothing else to install):
  ```bash
  curl -fsSL -o ~/.config/local/bin/omp \
    https://github.com/kml93/oh-my-pi/releases/download/dist/omp-linux-x64
  chmod +x ~/.config/local/bin/omp
  ```
  Stable URL — re-run to update. linux-x64/glibc only.
