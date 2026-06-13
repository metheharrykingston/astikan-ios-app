# Astikan mobile permissions patch

This patch updates the Astikan user app Android permissions for:

- Current location address auto-fill
- Emergency SOS dialer/calling readiness
- Camera/prescription capture
- Voice/microphone features
- Push notifications
- Gallery/image access

## Files included

- `android/app/src/main/AndroidManifest.xml`
- `ios-permissions/Info.plist.permission-snippet.xml`
- `ios-permissions/README.md`
- `ANDROID_IOS_PERMISSIONS_AUDIT.md`
- `scripts/build-android-debug-apk.sh`
- `scripts/build-android-release-apk.sh`

## Apply patch

Copy these files into the Astikan user app root, replacing the existing AndroidManifest.

## Build Android APK

From the user app root:

```bash
chmod +x scripts/build-android-debug-apk.sh
bash scripts/build-android-debug-apk.sh
```

Expected output:

```txt
android/app/build/outputs/apk/debug/app-debug.apk
```

## iOS

This project snapshot did not include a full Capacitor `ios/` folder. On macOS, after creating the iOS project, copy the keys from:

```txt
ios-permissions/Info.plist.permission-snippet.xml
```

into:

```txt
ios/App/App/Info.plist
```
