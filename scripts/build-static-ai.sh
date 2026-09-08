#!/usr/bin/env bash
# Builds a plain static HTML/CSS/JS export of the AI landing page for
# hosts with no Node.js runtime (shared cPanel/Apache, etc). Produces
# ./out — nothing else in the repo is touched permanently.
#
# Mirrors scripts/build-static.sh (the Cyber static export) exactly,
# just targeting the AI page instead — see that file for the full
# rationale on why app/api is moved aside for the duration of the build.
#
# Usage:
#   npm run build:static:ai                       # deploys under /ai/
#   STATIC_BASE_PATH="" npm run build:static:ai    # deploys at domain root
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

API_DIR="app/api"
API_TMP=".static-build-tmp/api"

if [ -d "$API_TMP" ]; then
  echo "error: $API_TMP already exists from a previous interrupted run — resolve manually before continuing" >&2
  exit 1
fi

restore_api() {
  if [ -d "$API_TMP" ]; then
    mv "$API_TMP" "$API_DIR"
    rmdir ".static-build-tmp" 2>/dev/null || true
    echo "restored $API_DIR"
  fi
}
trap restore_api EXIT

if [ -d "$API_DIR" ]; then
  mkdir -p "$(dirname "$API_TMP")"
  mv "$API_DIR" "$API_TMP"
  echo "temporarily moved $API_DIR aside for the static build"
fi

rm -rf out .next
STATIC_EXPORT=1 STATIC_PAGE=ai STATIC_BASE_PATH="${STATIC_BASE_PATH-/ai}" npx next build

for f in out/index.html out/lp/brand/ai/index.html; do
  if [ ! -f "$f" ]; then
    echo "error: expected $f not found — static export did not produce the expected page" >&2
    exit 1
  fi
done

echo "static export complete: ./out"
