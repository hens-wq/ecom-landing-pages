#!/usr/bin/env bash
# Builds a plain static HTML/CSS/JS export for hosts with no Node.js
# runtime (shared cPanel/Apache, etc). Produces ./out — nothing else in
# the repo is touched permanently.
#
# app/api/lead/route.ts cannot be statically exported (it parses the
# request body at request time, which needs a running server) — it is
# NOT deleted, just moved aside for the duration of this one build and
# restored immediately after, whether the build succeeds or fails.
#
# Usage:
#   npm run build:static                          # deploys under /cyber/
#   STATIC_BASE_PATH="" npm run build:static       # deploys at domain root
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

API_DIR="app/api"
# Outside app/ entirely (not just dot-prefixed within it) so there is no
# ambiguity about whether Next's App Router might still notice it.
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
STATIC_EXPORT=1 STATIC_BASE_PATH="${STATIC_BASE_PATH-/cyber}" npx next build

for f in out/index.html out/lp/brand/cyber/index.html; do
  if [ ! -f "$f" ]; then
    echo "error: expected $f not found — static export did not produce the expected page" >&2
    exit 1
  fi
done

echo "static export complete: ./out"
