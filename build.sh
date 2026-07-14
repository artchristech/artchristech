#!/usr/bin/env bash
# Assemble the publishable site into ./dist — the pruned set that actually ships.
# Excludes raw originals (assets/art, ~124MB, some files >25MB Pages limit),
# prototypes, node_modules, scripts, and dev docs. The optimized webp are committed,
# so no image processing runs here — this is a pure copy/assemble step.
set -euo pipefail
cd "$(dirname "$0")"

DIST=dist
rm -rf "$DIST"
mkdir -p "$DIST/assets"

# top-level pages + modules
cp index.html script.js marble.js styles.css contact.html dkski.html glyph-hero.html "$DIST/"

# optimized images (the only image dir the site references) + the 4 product screenshots + showcase covers
cp -R assets/optimized "$DIST/assets/optimized"
cp assets/gittimes-screenshot.png assets/glyph-screenshot.png \
   assets/middlefind-screenshot.png assets/passfit-screenshot.png "$DIST/assets/"
cp assets/curdle-cover.svg assets/fleet-cover.svg "$DIST/assets/"

# resources (AI history series)
cp -R resources "$DIST/resources"

echo "built $DIST: $(find "$DIST" -type f | wc -l | tr -d ' ') files, $(du -sh "$DIST" | cut -f1)"
