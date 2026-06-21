# Codemagic iOS Preview Final Fix

This package updates the `astikan-ios-simulator-preview` workflow to match Codemagic App Preview requirements more strictly.

## What changed

- Builds an unsigned iOS Simulator `.app` using `-sdk iphonesimulator`.
- Uses Codemagic/Xcode default DerivedData output instead of copying the `.app` to `$CM_EXPORT_DIR`.
- Exposes the exact artifact path recommended by Codemagic:

```yaml
artifacts:
  - $HOME/Library/Developer/Xcode/DerivedData/**/Build/Products/Debug-iphonesimulator/*.app
```

- Adds a verification step that fails the build if no `Debug-iphonesimulator/*.app` exists.
- Adds diagnostic output using `file` and `lipo -info` so you can confirm the binary is simulator-compatible.

## How to test

In Codemagic, run only this workflow first:

```txt
Astikan iOS Simulator Preview
```

After success, check the artifacts section. You must see a `.app` artifact, usually `App.app`. Quick Launch appears beside that `.app` only if App Preview is enabled for your Codemagic team.

## If Quick Launch still does not appear

If the `.app` artifact is visible but there is no Quick Launch button, the remaining issue is not the app code. Enable Codemagic App Preview from the App Preview page/team settings or contact Codemagic support.

If there is no `.app` artifact, open `/tmp/xcodebuild-ios-simulator.log` from the build artifacts and inspect the Xcode error.
