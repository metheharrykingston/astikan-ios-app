#!/usr/bin/env bash
set -euo pipefail

# Run from the Astikan user app root, the folder that contains package.json and android/
# This creates an unsigned/release APK unless your Gradle signingConfig is configured.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

npm run build
npx cap sync android
cd android
chmod +x gradlew
./gradlew assembleRelease

echo ""
echo "Release APK output folder:"
echo "$ROOT_DIR/android/app/build/outputs/apk/release/"
