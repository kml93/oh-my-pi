# Runtime: running omp from this fork

Three machine roles, three setups. Load this file when setting up a machine,
when `omp` fails to start (native loader errors), or before testing a branch
outside `kml93`.

## Dev machine (source-linked `omp`)

`bun install --global ./packages/coding-agent` symlinks the workspace package
into Bun's global tree, so the global `omp` runs this checkout's working tree —
branch switches and uncommitted edits are live. `sh scripts/link-omp.sh` is the
wrapper alternative (same effect).

Minimal deps (~312 MB, no Rust toolchain):

```bash
bun install --production --filter @oh-my-pi/pi-coding-agent
```

Then fetch the prebuilt addons pinned to the workspace natives version (same
pattern as CI; the files live in gitignored `packages/natives/native/` and
survive later installs):

```bash
ver=$(bun -e "console.log(require('./packages/natives/package.json').version)")
tb=$(npm view "@oh-my-pi/pi-natives-linux-x64@$ver" dist.tarball)
tmp=$(mktemp -d) && curl -fsSL --retry 3 "$tb" | tar -xz -C "$tmp"
cp "$tmp/package/"pi_natives.*.node packages/natives/native/
```

Gotchas:

- Exact version match is enforced at load time (version sentinel). A bare
  `bun add @oh-my-pi/pi-natives-linux-x64 --no-save` resolves to the stale
  lockfile pin and the loader silently rejects it.
- Moving or deleting the checkout breaks `omp` (symlink chain) — re-run the
  global install from the new path.
- Never install the dist build globally on a dev machine (overwrites the
  source link). Dev = source link, usage machines = dist.
- Probe before a session: `omp --smoke-test`.

## Testing a branch without disturbing the stable `omp`

The main checkout stays on `kml93` (that is what `omp` runs); test feature/PR/
port branches in a throwaway worktree. Worktrees share the git object store,
bun hard-links deps from its cache (~1 s install), and hard-linked natives
cost zero extra disk (validated: same inode, `nlink=2`):

```bash
git worktree add --detach ../omp-test <branch-or-sha>
cd ../omp-test
bun install --production --filter @oh-my-pi/pi-coding-agent
bun run gen:tool-views   # prod install skips this postinstall; CLI fails without it
ln /home/kml93/tmp/pi_omp-fusion/packages/natives/native/*.node packages/natives/native/
sh packages/coding-agent/scripts/omp --smoke-test
# cleanup: git worktree remove --force ../omp-test
```

`ln` (hard link) is safe: `.node` files are only read, never modified in
place. Only use it when the branch's `packages/natives/package.json` version
matches the main checkout — otherwise fetch pinned addons instead (see above).

## Usage machines (dist, no repo)

Rolling prerelease `dist` on the fork, rebuilt on every push to `kml93`
(`.github/workflows/dist-release.yml`; natives are fetched from the npm leaf
and embedded in the ELF — nothing else to install):

```bash
curl -fsSL -o ~/.config/local/bin/omp \
  https://github.com/kml93/oh-my-pi/releases/download/dist/omp-linux-x64
chmod +x ~/.config/local/bin/omp
```

Stable URL — re-run both commands to update. linux-x64/glibc only.
