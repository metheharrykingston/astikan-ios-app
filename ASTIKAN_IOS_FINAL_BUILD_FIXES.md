# Astikan iOS final build fixes — 2026-06-17

This zip patches the iOS project toward the same identity as Android:

- `PRODUCT_BUNDLE_IDENTIFIER = com.astikan.healthcare`
- `MARKETING_VERSION = 1.3`, `CURRENT_PROJECT_VERSION = 4`
- `GoogleService-Info.plist` is added to the Xcode resources phase
- `UIBackgroundModes` includes `remote-notification`
- `AppDelegate.swift` initializes Firebase and forwards Firebase Messaging token to Capacitor Push Notifications
- Firebase Messaging SPM package is referenced
- Capacitor iOS config now includes Cashfree allowNavigation and PushNotificationsPlugin

## One thing you still must do in Firebase

The included `GoogleService-Info.plist` was originally generated for the old iOS bundle id. I patched the visible `BUNDLE_ID` to `com.astikan.healthcare`, but the correct production fix is:

1. Firebase Console → Project settings → Add iOS app
2. Bundle ID: `com.astikan.healthcare`
3. Download the new `GoogleService-Info.plist`
4. Replace `ios/App/App/GoogleService-Info.plist` with that new file
5. Commit and rebuild on Codemagic

## iOS push still needs Apple-side setup

For real device push delivery you need Apple Developer setup:

- Bundle ID `com.astikan.healthcare` in Apple Developer portal
- Push Notifications capability enabled
- APNs Auth Key uploaded to Firebase Cloud Messaging → Apple app configuration
- Codemagic signing/provisioning configured for `com.astikan.healthcare`

Without APNs + signing, iOS build can compile but push will not deliver on real iPhones.

## PWA/live-update behavior

Because Capacitor config uses `server.url = https://employee.astikan.tech`, the iOS app loads the live hosted web app just like Android. Web UI changes deployed to `employee.astikan.tech` can appear without App Store updates, as long as you are not changing native plugins, permissions, signing, bundle id, app icons, splash screen, or Info.plist capabilities.


## 2026-06-17 final Firebase iOS plist update

- Replaced `ios/App/App/GoogleService-Info.plist` with the Firebase iOS app config for bundle ID `com.astikan.healthcare`.
- Kept `import FirebaseCore` and `FirebaseApp.configure()` in `ios/App/App/AppDelegate.swift`.
- Added explicit Firebase iOS SDK package products for both `FirebaseCore` and `FirebaseMessaging` from `https://github.com/firebase/firebase-ios-sdk.git` in the Xcode project.
- Bundle ID remains `com.astikan.healthcare`, version `1.3`, build `4`.

## 2026-06-17 Codemagic npm registry fix

Codemagic was failing during `npm ci` because `package-lock.json` had an OpenAI internal artifact registry URL for `@capacitor/push-notifications`. This project is now fixed by:

- replacing internal resolved npm tarball URLs with `https://registry.npmjs.org/`
- adding `.npmrc` pinned to the public npm registry
- updating `codemagic.yaml` install steps to reset npm registry/proxy before `npm ci`
- updating signed IPA workflow bundle identifier to `com.astikan.healthcare`

If Codemagic still caches an old build, clear/rebuild from latest commit.
