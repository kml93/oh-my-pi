# Runtime: running omp from this fork

Three machine roles, three setups. Load this file when setting up a machine,
when `omp` fails to start (native loader errors), or before testing a branch
outside `kml93`.

## Dev machine

Run the setup script listed in `SKILL.md` from the skill directory, then verify:

```bash
omp --smoke-test
```

Decision tree:

```text
Run setup
├─ Dependencies missing or changed → install minimum runtime tree
├─ Heavy optional runtimes present → remove silently
├─ Matching native addon present → reuse
├─ Matching native addon cached → link, else copy
└─ Matching native addon absent → download once, cache, install
```

## Testing a branch without disturbing the stable `omp`

The main checkout stays on `kml93` (that is what `omp` runs); test feature/PR/
port branches in a throwaway worktree. Worktrees share the git object store,
bun hard-links deps from its cache (~1 s install), and hard-linked natives
cost zero extra disk (validated: same inode, `nlink=2`):

```bash
main_checkout=$(git rev-parse --show-toplevel)
git worktree add --detach .worktrees/omp-test <branch-or-sha>
cd .worktrees/omp-test
bun install --production --filter @oh-my-pi/pi-coding-agent
bun run gen:tool-views   # prod install skips this postinstall; CLI fails without it
ln "$main_checkout/packages/natives/native/"*.node packages/natives/native/
sh packages/coding-agent/scripts/omp --smoke-test
# cleanup: git worktree remove --force .worktrees/omp-test
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
