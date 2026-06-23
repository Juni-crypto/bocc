# samples/

Drop real face photos here before running `scripts/spike-selfie-match.mjs`:

- a few group/gallery shots (JPG/PNG/WEBP) that contain clear, distinct faces,
  ideally with the same person appearing in more than one shot;
- one close-up of that person named `selfie.jpg` (or `selfie.*`). If no file
  matches `selfie.*`, the script uses the last image as the selfie.

If this folder is empty, the script generates placeholder PNGs so the upload
path still runs, but placeholders have no faces, so the verdict is
INCONCLUSIVE. Use real photos for a meaningful Path A vs Path B result.

Photos you drop here are git-ignored.
