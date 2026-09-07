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
2. Synchronize the PR branch (`omp/pr--<name>`) with `main` and resolve the conflict there with a minimal diff.
3. Validate the PR test suite.
4. Merge the updated PR branch and `main` into `kml93`.

---

## Tracking PI

Fetch and inspect PI read-only:

```bash
git fetch upstream-pi
git log --oneline --graph kml93..upstream-pi/main
```

NEVER merge `upstream-pi/main` into `main` or `kml93`. A selected change moves to the porting workflow in `references/porting.md`.
