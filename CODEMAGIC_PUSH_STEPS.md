# Astikan Codemagic iOS setup

Push this full project root to GitHub, not only the ios folder.

```bash
cd ~/astikan/apps/employee-app
rm -rf ios/.git

git init
git add .
git commit -m "prepare full capacitor project for codemagic"
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/YOUR_USERNAME/astikan-ios-app.git
git push -u origin main --force
```

In Codemagic choose YAML workflow.

Start with `astikan-ios-build-check`. This confirms the app compiles without Apple signing.

For IPA, use `astikan-ios-ad-hoc-ipa` after adding Apple Developer signing assets and registered UDIDs in Codemagic.

Important bundle IDs:
- iOS Firebase `GoogleService-Info.plist` is for `com.astikan.user`.
- Android package/application ID is `com.astikan.healthcare`.

For iOS Ad Hoc signing, use bundle ID `com.astikan.user` unless you create a new Firebase iOS app and Apple Bundle ID for another identifier.
