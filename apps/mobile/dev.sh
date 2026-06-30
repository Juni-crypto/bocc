#!/usr/bin/env bash
# Start the local Metro dev server for the BOCC development build.
#
# Use this after installing the dev-client APK on your phone/emulator:
#   1. Install android/app/build/outputs/apk/debug/app-debug.apk on the device
#   2. Phone + this Mac must be on the SAME Wi-Fi
#   3. Run: ./dev.sh   (then open the "BOCC (dev)" app and tap the server URL)
#
# Live JS changes hot-reload instantly. Native changes need a rebuild:
#   ./rebuild-android.sh
set -e
cd "$(dirname "$0")"

export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

# If a device/emulator is plugged in over USB, forward Metro so localhost works.
adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true

echo "Metro starting. Open the BOCC (dev) app on your device and connect."
echo "API target: ${EXPO_PUBLIC_API_URL:-$(grep EXPO_PUBLIC_API_URL .env 2>/dev/null | cut -d= -f2)}"
npx expo start --dev-client
