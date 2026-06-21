# Astikan iOS Parity Patch Notes

Applied fixes without changing Android identity/config:

1. Synced `ios/App/App/public` from the newer Android bundle at `android/app/src/main/assets/public`.
2. Fixed iOS Google Sign-In values to match `ios/App/App/GoogleService-Info.plist`:
   - `GIDClientID`: `201357365434-7lav4l8jve7dkpeh761jsjuac2a4do2u.apps.googleusercontent.com`
   - URL scheme: `com.googleusercontent.apps.201357365434-7lav4l8jve7dkpeh761jsjuac2a4do2u`
3. Added `ios/App/App/App.entitlements` and connected it in the Xcode project for push notification entitlement support.
4. Changed the iOS launch screen to match Android visually: white background + centered logo.
5. Removed the unused/broken iOS native Cashfree Cordova bridge from the build path because the app source uses Cashfree web checkout, matching Android.

Still needs real account-side values before release if you use deep links:

- Replace `TEAM_ID.com.astikan.healthcare` in `apple-app-site-association` after you know the Apple Team ID.
- Replace `REPLACE_WITH_RELEASE_CERT_SHA256` in `assetlinks.json` after generating the final Play release signing SHA-256.
- Upload APNs key/certificate in Firebase for iOS push notifications.

## Font note

Bundled `.ttf/.otf/.woff/.woff2` files are not included in this shared zip. Keep your licensed font files in your private local repository or replace them with licensed alternatives before building a branded release.
