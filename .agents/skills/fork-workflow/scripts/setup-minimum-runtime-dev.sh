#!/bin/sh
set -eu

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P)
target="${1:-$PWD}"
if [ -f "$target/packages/natives/package.json" ]; then
  repo_root=$(CDPATH='' cd -- "$target" && pwd -P)
else
  repo_root=$(CDPATH='' cd -- "$script_dir/../../../.." && pwd -P)
fi
native_dir=$repo_root/packages/natives/native
cache_root=${XDG_CACHE_HOME:-$HOME/.cache}/omp/natives

if ! command -v bun >/dev/null 2>&1; then
  echo "setup-minimum-runtime-dev: bun is required" >&2
  exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  echo "setup-minimum-runtime-dev: curl is required" >&2
  exit 1
fi
if ! command -v tar >/dev/null 2>&1; then
  echo "setup-minimum-runtime-dev: tar is required" >&2
  exit 1
fi

version=$(cd "$repo_root" && bun -e "console.log(require('./packages/natives/package.json').version)")
version_cache=$cache_root/$version
modern=pi_natives.linux-x64-modern.node
baseline=pi_natives.linux-x64-baseline.node

case $(uname -s):$(uname -m) in
  Linux:x86_64) ;;
  *)
    echo "setup-minimum-runtime-dev: supported platform is linux-x64/glibc" >&2
    exit 1
    ;;
esac

addon_is_current() {
  file=$1
  [ -f "$file" ] || return 1
  sentinel=__piNativesV$(printf '%s' "$version" | tr '.-' '__')
  python3 -c 'import sys; data = open(sys.argv[1], "rb").read(); sys.exit(0 if sys.argv[2].encode() in data else 1)' "$file" "$sentinel" 2>/dev/null
}

cache_is_current() {
  addon_is_current "$version_cache/$modern" && addon_is_current "$version_cache/$baseline"
}

workspace_is_current() {
  addon_is_current "$native_dir/$modern" && addon_is_current "$native_dir/$baseline"
}

fetch_addons() {
  mkdir -p "$version_cache"
  tarball=$( (cd "$repo_root" && bun pm view "@oh-my-pi/pi-natives-linux-x64@$version" dist.tarball 2>/dev/null) || (cd "$repo_root" && bun pm view "@oh-my-pi/pi-natives-linux-x64@latest" dist.tarball) )
  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp" >/dev/null 2>&1' EXIT HUP INT TERM
  curl -fsSL --retry 3 "$tarball" | tar -xz -C "$tmp"
  cp "$tmp/package/$modern" "$version_cache/$modern"
  cp "$tmp/package/$baseline" "$version_cache/$baseline"
  rm -rf "$tmp" >/dev/null 2>&1
  trap - EXIT HUP INT TERM
  cache_is_current || {
    echo "setup-minimum-runtime-dev: downloaded addons do not match version $version" >&2
    exit 1
  }
  native_status=downloaded
}

install_addons() {
  mkdir -p "$native_dir"
  rm -f "$native_dir/$modern" "$native_dir/$baseline" >/dev/null 2>&1
  ln "$version_cache/$modern" "$native_dir/$modern" 2>/dev/null || cp "$version_cache/$modern" "$native_dir/$modern"
  ln "$version_cache/$baseline" "$native_dir/$baseline" 2>/dev/null || cp "$version_cache/$baseline" "$native_dir/$baseline"
  workspace_is_current || {
    echo "setup-minimum-runtime-dev: failed to install addons for version $version" >&2
    exit 1
  }
}

cd "$repo_root"
bun install --filter @oh-my-pi/pi-coding-agent --omit=dev --omit=optional

removed_count=0
for relative_path in \
  node_modules/fastembed \
  node_modules/onnxruntime-node \
  node_modules/onnxruntime-web \
  node_modules/onnxruntime-common \
  node_modules/@huggingface
do
  if [ -e "${repo_root:?}/$relative_path" ]; then
    rm -rf "${repo_root:?}/${relative_path:?}" >/dev/null 2>&1
    removed_count=$((removed_count + 1))
  fi
done

native_status=reused
if ! workspace_is_current; then
  if ! cache_is_current; then
    fetch_addons
  fi
  install_addons
fi

if [ ! -f "$repo_root/packages/coding-agent/src/export/html/tool-views.generated.js" ]; then
  bun run gen:tool-views
fi

sh "$repo_root/scripts/link-omp.sh"
node_modules_size=$(du -sh "$repo_root/node_modules" | cut -f1)
printf 'setup-minimum-runtime-dev: node_modules=%s, dropped=%s, natives=%s@%s\n' \
  "$node_modules_size" "$removed_count" "$native_status" "$version"
