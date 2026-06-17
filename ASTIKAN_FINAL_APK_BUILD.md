# Astikan final APK build checklist

This package is the real `com.astikan.healthcare` Capacitor user app, not the broken thin wrapper.

## Before building

1. Put your final frontend values into `.env.production`.
2. Download Firebase Android `google-services.json` for package `com.astikan.healthcare` and place it at:

   `android/app/google-services.json`

3. Keep `capacitor.config.ts` with:
   - `appId: com.astikan.healthcare`
   - `appName: Astikan`
   - `webDir: dist`
   - Cashfree allowNavigation entries: `sdk.cashfree.com`, `*.cashfree.com`

## Build

```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew clean
./gradlew :app:assembleDebug
```

Debug APK:

`android/app/build/outputs/apk/debug/Astikan-debug.apk`

Release APK:

```bash
./gradlew :app:assembleRelease
```

Play Store bundle:

```bash
./gradlew :app:bundleRelease
```

## Verify

```bash
aapt dump badging android/app/build/outputs/apk/debug/Astikan-debug.apk | head -20
unzip -l android/app/build/outputs/apk/debug/Astikan-debug.apk | grep "assets/public/assets" | head
unzip -p android/app/build/outputs/apk/debug/Astikan-debug.apk assets/capacitor.config.json | grep -i cashfree
unzip -l android/app/build/outputs/apk/debug/Astikan-debug.apk | grep firebase-messaging-sw
```

Expected:

- package name: `com.astikan.healthcare`
- app assets included, not a tiny wrapper
- Cashfree domains included
- Firebase service worker included
- `google-services.json` present before native push build

## Future-safe native permissions included

- Network/payment/Firebase: `INTERNET`, `ACCESS_NETWORK_STATE`
- Notifications: `POST_NOTIFICATIONS`
- Camera/report upload: `CAMERA`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, legacy `READ_EXTERNAL_STORAGE` up to SDK 32
- Voice/teleconsult: `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `WAKE_LOCK`
- Location/address/SOS: `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`
- Dial/SOS: `CALL_PHONE`, ACTION_DIAL query
- Foreground voice service: `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MICROPHONE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`

Not included intentionally: SMS, contacts, call logs, background location, manage all files, Bluetooth scan, exact alarms, install packages. Add those only when a real feature needs them.
