#!/usr/bin/env bash
# Installs js-sdk and button-sdk into a throwaway consumer project the way a
# real consumer gets them — as packed tarballs, so `files`, `exports` and the
# built dist are what is under test, not the source tree — then checks both
# module formats and, when SHOTPAY_E2E_* vars are set, runs a live e2e.
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
pack="$(mktemp -d)"
trap 'rm -rf "$pack"' EXIT

for package in js-sdk button-sdk; do
    (cd "$repo/$package" && npm ci && npm run build && npm pack --pack-destination "$pack" > /dev/null)
done

cd "$repo/consumer-e2e"
rm -rf node_modules package-lock.json
npm install --no-save --no-package-lock "$pack"/*.tgz react@^19 jsdom@^26

node check-esm.mjs
node check-cjs.cjs
node e2e.mjs
