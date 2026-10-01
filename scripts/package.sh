#!/usr/bin/env bash
# Builds dist/clear-site-data-<version>.zip with manifest.json at the zip root,
# which is the layout the Chrome Web Store upload expects.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
version="$(node -p "require('$root/extension/manifest.json').version")"
out="$root/dist/clear-site-data-$version.zip"

mkdir -p "$root/dist"
rm -f "$out"
(cd "$root/extension" && zip -qrX "$out" . -x '.*')
echo "$out"
