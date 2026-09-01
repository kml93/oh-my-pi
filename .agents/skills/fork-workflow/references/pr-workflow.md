# Upstream Pull Request Workflow (to `can1357/oh-my-pi`)

Follow this workflow to submit clean fixes or enhancements to official `omp` without including any custom modifications or `pi` ports.

## 1. Create a Worktree from Current `main`

Keep the primary checkout on `kml93`. Update `main`, then create the PR branch and worktree:

```bash
git fetch upstream-omp main:main
git worktree add -b omp/pr--<short-description> .worktrees/omp-pr--<short-description> main
```

Before building on the branch, make sure `kml93` already contains this `main`
(sync per `references/sync.md`, or check `git merge-base --is-ancestor main
kml93`). A merge imports the branch's full ancestry, not just the PR commit:
merging a `main`-based PR while `kml93` lacks that `main` silently turns step 4
into an unsolicited upstream sync.

## 2. Implement & Verify

1. Make focused changes strictly for `omp`.
2. Follow `omp` code style:
   ```bash
   bun run check:ts
   bun run lint:ts
   ```
3. Commit using standard Conventional Commits:
   ```bash
   git commit -m "fix(lsp): resolve diagnostic URI normalization edge case"
   ```

## 3. Push and Open PR

```bash
git push -u origin omp/pr--<short-description>
```

Open PR on GitHub:
- Base repository: `can1357/oh-my-pi` (branch `main`)
- Head repository: `kml93/oh-my-pi` (branch `omp/pr--<short-description>`)

## 4. Integrate into `kml93`

Use the PR immediately without moving the primary checkout:

```bash
git -C <primary-checkout> merge omp/pr--<short-description>
git -C <primary-checkout> push origin kml93
```

When upstream merges your PR later during a regular `sync(omp)` operation, Git's 3-way merge will recognize identical commits seamlessly.
