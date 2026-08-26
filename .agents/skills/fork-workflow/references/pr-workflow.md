# Upstream Pull Request Workflow (to `can1357/oh-my-pi`)

Follow this workflow to submit clean fixes or enhancements to official `omp` without including any custom modifications or `pi` ports.

## 1. Branch from Clean `main`

Never branch a PR from `kml93`. Always start from up-to-date `main`:

```bash
git checkout main
git fetch upstream-omp
git merge upstream-omp/main --ff-only
git checkout -b omp/pr--<short-description>
```

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

## 4. Benefit from your PR Immediately in `kml93`

Do not wait for upstream review to use your own fix:

```bash
git checkout kml93
git merge omp/pr--<short-description>
git push origin kml93
```

When upstream merges your PR later during a regular `sync(omp)` operation, Git's 3-way merge will recognize identical commits seamlessly.
