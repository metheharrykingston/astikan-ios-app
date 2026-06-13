#!/usr/bin/env bash
set -euo pipefail

# Run from the Astikan user app root, the folder that contains package.json and android/
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Installing frontend dependencies..."
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

echo "Building Vite web assets..."
npm run build

echo "Syncing Capacitor Android project..."
npx cap sync android

echo "Building Android debug APK..."
cd android
chmod +x gradlew
./gradlew assembleDebug

APK_PATH="$ROOT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
DESKTOP_DIR="$HOME/Desktop/astikan-apks"
DOWNLOADS_DIR="$HOME/Downloads/astikan-apks"
mkdir -p "$DESKTOP_DIR" "$DOWNLOADS_DIR"
cp "$APK_PATH" "$DESKTOP_DIR/Astikan-user-latest-debug.apk"
cp "$APK_PATH" "$DOWNLOADS_DIR/Astikan-user-latest-debug.apk"

echo ""
echo "APK created at:"
echo "$APK_PATH"
echo ""
echo "Copied latest APK to:"
echo "$DESKTOP_DIR/Astikan-user-latest-debug.apk"
echo "$DOWNLOADS_DIR/Astikan-user-latest-debug.apk"
