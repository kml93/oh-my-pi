# Upstream Synchronization Guide

## 1. Synchronizing with Official `omp` (`can1357/oh-my-pi`)

Always update `main` first before bringing changes into `kml93`.

### Step 1: Update clean `main`
```bash
git checkout main
git fetch upstream-omp
git merge upstream-omp/main --ff-only
git push origin main
```
*Note: This must always be a fast-forward (`--ff-only`) because `main` has zero custom commits.*

### Step 2: Integrate into `kml93`
```bash
git checkout kml93
git merge main
# Run smoke tests
bun packages/coding-agent/src/cli.ts --version
git push origin kml93
```

### Resolving Merge Conflicts
If upstream `omp` modified files you touched in `kml93`:
1. Check conflicted files: `git status`
2. Preserve `omp` architectural upgrades while keeping your custom feature hooks.
3. Verify the build: `bun packages/coding-agent/src/cli.ts --smoke-test`
4. Commit: `git commit -m "sync(omp): resolve merge conflicts with upstream-omp/main"`

---

## 2. Tracking Updates from `pi` (`earendil-works/pi`)

Never merge entire `upstream-pi/main` into `kml93` or `main`.

### Step 1: Fetch and inspect changes
```bash
git fetch upstream-pi
git log --oneline --graph kml93..upstream-pi/main
```

### Step 2: Selective Cherry-pick / Port
When an isolated bugfix or feature is identified:
```bash
git checkout kml93
git checkout -b pi:port--<feature-name>
# If cleanly cherry-pickable:
git cherry-pick <commit-hash>
# Otherwise, manually adapt the code to omp architecture
# Test, then merge:
git checkout kml93
git merge pi:port--<feature-name>
git branch -d pi:port--<feature-name>
git push origin kml93
```
