# Codemagic preview fix

Your previous Codemagic workflow built an iOS device `.app` using `generic/platform=iOS`. Codemagic App Preview needs either:

- an Android `.apk` artifact, or
- an iOS simulator `.app` artifact built with `iphonesimulator`.

This patch adds three preview-friendly workflows:

1. `astikan-android-preview-apk` — produces a debug APK for Android emulator Quick Launch.
2. `astikan-ios-simulator-preview` — produces an unsigned iOS Simulator `.app` for iOS browser Quick Launch.
3. `astikan-web-build-artifact` — exports the Vite `dist` folder as a zip artifact. This is not mobile App Preview, but it confirms the web bundle builds correctly.

Use these first:

```txt
Codemagic → Start new build → choose workflow:
1. Astikan Android Preview APK
2. Astikan iOS Simulator Preview
```

After a successful build, Codemagic should show **Quick Launch** next to the `.apk` or simulator `.app` artifact.

Important: the `Astikan iOS Ad Hoc IPA` workflow is for real-device installation/testing. It will not create browser App Preview by itself.
