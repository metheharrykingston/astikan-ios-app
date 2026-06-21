# Astikan mobile permissions audit

## Android changes applied

File updated:

- `android/app/src/main/AndroidManifest.xml`

Permissions added:

- `INTERNET` — APIs, Cashfree, Firebase, Mapbox, pincode lookup.
- `ACCESS_NETWORK_STATE` — network availability checks.
- `ACCESS_COARSE_LOCATION` — approximate location for address/SOS.
- `ACCESS_FINE_LOCATION` — precise location for address/SOS.
- `CALL_PHONE` — direct call capability if native SOS direct-call is enabled later.
- `VIBRATE` — SOS/haptic feedback.
- `CAMERA` — prescription capture and AI camera review.
- `READ_MEDIA_IMAGES` — Android 13+ image picker/library access when needed.
- `READ_EXTERNAL_STORAGE` with `maxSdkVersion=32` — older Android gallery/file access.
- `RECORD_AUDIO` — voice input / AI voice review / SOS voice note.
- `POST_NOTIFICATIONS` — Android 13+ booking, receipt, and status notifications.

Optional hardware features were marked `required="false"` so devices are not excluded from Play Store if they lack GPS/camera/telephony/mic.

A package-visibility `<queries>` block was added for `ACTION_DIAL` with `tel:` so SOS dialer links resolve cleanly on Android 11+.

## Important runtime notes

- Do not request all permissions on app launch.
- Request location only on address screens or SOS action.
- Request camera/photo permissions only when user captures/uploads a prescription/report.
- Request microphone only when voice feature starts.
- For SOS, prefer opening dialer with `tel:112`; direct call can use `CALL_PHONE` later if required.

## iOS preparation

This package does not include a generated Capacitor iOS project. A permission snippet was added at:

- `ios-permissions/Info.plist.permission-snippet.xml`

When you generate/open iOS on macOS, copy those keys into:

- `ios/App/App/Info.plist`
