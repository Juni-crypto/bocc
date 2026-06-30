#!/usr/bin/env bash
# Rebuild the BOCC Android dev-client APK (only needed after NATIVE changes:
# new native deps, app.json/plugins, icons. Plain JS/TS edits hot-reload via
# Metro and do NOT need a rebuild).
#
# Output: android/app/build/outputs/apk/debug/app-debug.apk
set -e
cd "$(dirname "$0")"

export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

printf "sdk.dir=%s\n" "$ANDROID_HOME" > android/local.properties
( cd android && ./gradlew assembleDebug --no-daemon )

APK=android/app/build/outputs/apk/debug/app-debug.apk
echo "Built: $APK"

# Auto-install if a device/emulator is connected.
if adb get-state >/dev/null 2>&1; then
  adb install -r "$APK" && echo "Installed on the connected device."
else
  echo "No device connected over USB. Transfer $APK to your phone and install it,"
  echo "or connect the phone (USB debugging) and run: adb install -r $APK"
fi
