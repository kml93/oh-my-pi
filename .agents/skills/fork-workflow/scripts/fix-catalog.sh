#!/bin/sh
# Single entry point for the generated catalog files
# (packages/catalog/src/{compat/rules,models}.json). Always leaves both files
# in their correct state:
#   - resolves a merge conflict on models.json (upstream snapshot as base),
#   - regenerates rules.json from the merged KDL tree (gen:compat),
#   - re-injects missing fork seed rows and canonicalizes models.json
#     (engine and rationale: regen-fork-catalog-seeds.ts).
#
# Usage: fix-catalog.sh [repo-root]   (default: $PWD; primary checkout or
# worktree). Idempotent: safe to run on any tree state.
set -eu

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P)
root="${1:-$PWD}"
root=$(CDPATH='' cd -- "$root" && pwd -P)

# The seed engine compiles through buildModel(), which loads the native
# addons. A fresh worktree has none until setup-minimum-runtime-dev.sh ran.
if ! ls "$root"/packages/natives/native/*.node >/dev/null 2>&1; then
  echo "fix-catalog: native addons missing in $root — run the fork-workflow setup-minimum-runtime-dev.sh there first" >&2
  exit 1
fi

# Conflict on models.json? Start from upstream's generated snapshot.
if (cd "$root" && git ls-files -u -- packages/catalog/src/models.json | grep -q .); then
  (cd "$root" && git checkout --theirs -- packages/catalog/src/models.json)
fi

(cd "$root/packages/catalog" && bun run gen:compat)
(cd "$root" && bun "$script_dir/regen-fork-catalog-seeds.ts" "$root")
(cd "$root" && git add packages/catalog/src/compat/rules.json packages/catalog/src/models.json)
echo "fix-catalog: catalog files resolved and canonical"
