#!/bin/sh
# Resolves merge conflicts on the generated catalog files
# (packages/catalog/src/{compat/rules,models}.json). Rationale and mechanics:
# see regen-fork-catalog-seeds.ts and references/sync.md.
#
# Usage: resolve-catalog-conflicts.sh [repo-root]   (default: $PWD; primary
# checkout or worktree). Idempotent: exits 0 when no catalog file is unmerged.
set -eu

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P)
root="${1:-$PWD}"
root=$(CDPATH='' cd -- "$root" && pwd -P)

# The seed re-injection compiles through buildModel(), which loads the native
# addons. A fresh worktree has none until setup-minimum-runtime-dev.sh ran.
if ! ls "$root"/packages/natives/native/*.node >/dev/null 2>&1; then
  echo "resolve-catalog-conflicts: native addons missing in $root — run the fork-workflow setup-minimum-runtime-dev.sh there first" >&2
  exit 1
fi

take_theirs_if_unmerged() {
  if (cd "$root" && git ls-files -u -- "$1" | grep -q .); then
    (cd "$root" && git checkout --theirs -- "$1")
  fi
}

if ! (cd "$root" && git ls-files -u -- \
    packages/catalog/src/compat/rules.json \
    packages/catalog/src/models.json | grep -q .); then
  echo "resolve-catalog-conflicts: no unmerged catalog files; nothing to do" >&2
  exit 0
fi

take_theirs_if_unmerged packages/catalog/src/models.json

(cd "$root/packages/catalog" && bun run gen:compat)
(cd "$root" && bun "$script_dir/regen-fork-catalog-seeds.ts" "$root")

(cd "$root" && git add packages/catalog/src/compat/rules.json packages/catalog/src/models.json)
echo "resolve-catalog-conflicts: catalog conflicts resolved deterministically"
