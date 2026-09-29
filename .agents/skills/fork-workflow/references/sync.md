# Upstream Synchronization Guide

## Synchronizing Official OMP

Keep the primary checkout on `kml93`.

### Update the clean mirror

```bash
git fetch upstream-omp main:main
git push origin main
```

`main` MUST remain an exact fast-forwardable mirror.

### Integrate into `kml93`

Clean fast-forward or conflict-free merge? Merge `main` directly in the primary checkout:

```bash
git merge main
scripts/setup-minimum-runtime-dev.sh
omp --smoke-test
git push origin kml93
```

Conflicts or substantial validation expected? Isolate the integration:

```bash
git worktree add -b omp/sync--<version> .worktrees/omp-sync--<version> kml93
git -C .worktrees/omp-sync--<version> merge main
```

Resolve conflicts by preserving OMP architectural upgrades and fork-local hooks. Verify, commit with `sync(omp): ...`, then merge the sync branch into the primary `kml93` checkout.

### Conflicts Originating from an In-Flight PR (`omp/pr--*`)

Never resolve conflicts originating from an open/in-flight PR branch directly in `kml93`:
1. `git merge --abort` to keep `kml93` clean.
2. Rebuild the PR branch on the new `main` tip — procedure below.
3. Validate the PR test suite in the worktree.
4. Merge the updated PR branch and `main` into `kml93`.

### Rebuilding an In-Flight PR Branch (`omp/pr--*`)

Run this whenever `main` advanced under an open PR — conflict or not. NEVER
`git merge main` inside a PR branch: every merge commit anchors the PR to a
stale base, and `git diff main..branch` then shows phantom reversions of
upstream commits (observed: a 13-file feature displayed as 90+ changed files).

`omp/pr--*` branches MUST stay exactly ONE commit on top of `main`. No backup
tag needed — the replay source is `origin/omp/pr--<name>`, which keeps the old
tip until the force-push (reflog covers recovery beyond that):

```bash
# 0. Unpushed local commits on the branch? Push first — the replay source is the remote ref.

# 1. Move the clean mirror forward.
git fetch upstream-omp main:main

# 2. Replay the branch's net diff onto the new tip, no merge commits.
git worktree add .worktrees/omp-pr--<name> omp/pr--<name>
git -C .worktrees/omp-pr--<name> reset --hard main
git -C .worktrees/omp-pr--<name> merge --squash origin/omp/pr--<name>
```

- Catalog files (`rules.json` / `models.json`) conflict on almost every rebuild → resolve with `scripts/fix-catalog.sh <worktree-root>` (see next section). NEVER by hand.
- Fresh worktree prerequisite: `scripts/setup-minimum-runtime-dev.sh` (native addons for fix-catalog.sh), then `bun install`, before running tests.
- Commit with the branch's single feature message, then `git push --force-with-lease origin omp/pr--<name>`.
- Fold review-feedback fixes into the SAME commit (amend or squash) — never stack fix commits on the branch.

### Generated Catalog Files (`rules.json` / `models.json`)

Merge conflict on either file (happens on every upstream sync until the fork seed's PR lands upstream) → run the fixer on the conflicted tree (primary checkout or worktree):

```bash
scripts/fix-catalog.sh <repo-or-worktree-root>
```

- NEVER resolve these two files by hand; NEVER use `bun run gen:models` (network-dependent, non-deterministic).

## Tracking PI

Fetch and inspect PI read-only:

```bash
git fetch upstream-pi
git log --oneline --graph kml93..upstream-pi/main
```

NEVER merge `upstream-pi/main` into `main` or `kml93`. A selected change moves to the porting workflow in `references/porting.md`.
