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
bun packages/coding-agent/src/cli.ts --smoke-test
git push origin kml93
```

Conflicts or substantial validation expected? Isolate the integration:

```bash
git worktree add -b omp/sync--<version> .worktrees/omp-sync--<version> kml93
git -C .worktrees/omp-sync--<version> merge main
```

Resolve conflicts by preserving OMP architectural upgrades and fork-local hooks. Verify, commit with `sync(omp): ...`, then merge the sync branch into the primary `kml93` checkout.

---

## Tracking PI

Fetch and inspect PI read-only:

```bash
git fetch upstream-pi
git log --oneline --graph kml93..upstream-pi/main
```

NEVER merge `upstream-pi/main` into `main` or `kml93`. A selected change moves to the porting workflow in `references/porting.md`.
