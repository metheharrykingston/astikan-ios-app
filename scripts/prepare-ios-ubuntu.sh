#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_NAME="${APP_NAME:-Astikan}"
BUNDLE_ID="${BUNDLE_ID:-com.astikan.user}"

echo "Installing dependencies..."
npm ci --no-audit --no-fund

echo "Ensuring Capacitor iOS package exists..."
npm install @capacitor/ios --save --no-audit --no-fund

echo "Building Vite web assets..."
npm run build

echo "Checking Capacitor config..."
if [ -f capacitor.config.ts ]; then
  echo "capacitor.config.ts found"
elif [ -f capacitor.config.json ]; then
  echo "capacitor.config.json found"
else
  echo "No capacitor config found. Creating basic capacitor.config.ts"
  cat > capacitor.config.ts <<EOF
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: '${BUNDLE_ID}',
  appName: '${APP_NAME}',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
EOF
fi

echo "Creating iOS project if missing..."
if [ ! -d ios ]; then
  npx cap add ios
else
  echo "ios/ already exists"
fi

echo "Copying web assets to iOS..."
npx cap copy ios

echo "Patching iOS Info.plist permissions..."
python3 <<'PY'
from pathlib import Path
import re

plist = Path("ios/App/App/Info.plist")
if not plist.exists():
    raise SystemExit("Info.plist not found at ios/App/App/Info.plist")

text = plist.read_text()

keys = {
    "CFBundleDisplayName": "Astikan",
    "NSLocationWhenInUseUsageDescription": "Astikan uses your location to auto-fill delivery addresses and support SOS emergency services.",
    "NSCameraUsageDescription": "Astikan uses your camera to capture prescriptions, reports, and emergency documents.",
    "NSPhotoLibraryUsageDescription": "Astikan lets you select prescription images, reports, and medical documents from your photo library.",
    "NSPhotoLibraryAddUsageDescription": "Astikan may save downloaded medical reports or receipts to your photo library when you choose to save them.",
    "NSMicrophoneUsageDescription": "Astikan uses your microphone for voice input and emergency voice notes when enabled.",
}

insert_items = []
for key, value in keys.items():
    if f"<key>{key}</key>" not in text:
        insert_items.append(f"""
\t<key>{key}</key>
\t<string>{value}</string>""")

if insert_items:
    text = text.replace("</dict>", "".join(insert_items) + "\n</dict>")

plist.write_text(text)
print("Patched", plist)
PY

echo "Creating iOS handoff ZIP..."
OUT_DIR="$HOME/Downloads/astikan-ios-handoff"
mkdir -p "$OUT_DIR"

ZIP_PATH="$OUT_DIR/Astikan-user-ios-prepared.zip"
rm -f "$ZIP_PATH"

zip -r "$ZIP_PATH" ios capacitor.config.* package.json package-lock.json dist >/dev/null

echo ""
echo "iOS project prepared."
echo "ZIP created at:"
echo "$ZIP_PATH"
echo ""
echo "Next on macOS:"
echo "1. unzip Astikan-user-ios-prepared.zip"
echo "2. npm ci"
echo "3. npx cap sync ios"
echo "4. npx cap open ios"
echo "5. Xcode → Signing & Capabilities → select Apple Team"
echo "6. Product → Archive"
