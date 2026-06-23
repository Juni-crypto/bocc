# @bocc/shared

Single source of truth for **BOCC** (Be Our Camera Crew): TypeScript types that mirror
the NestJS + Prisma backend, plus a typed, dependency-free API client used by both the
web app (Next.js) and the mobile app (Expo / React Native).

The only runtime requirements are the global `fetch` and `FormData`, both available in
modern browsers, React Native, and Node 18+.

## What is exported

- **Enums** (string-literal unions, mirroring Prisma): `EventStatus`, `EventType`,
  `Visibility`, `UploadWindow`, `DownloadPolicy`, `MemberRole`, `PhotoStatus`, plus
  runtime arrays such as `EVENT_TYPES` for dropdowns.
- **Types**: `Event`, `Member`, `Photo`, `EventWithJoinUrl`, `PublicPhoto`, `Stats`,
  request inputs (`CreateEventInput`, `UpdateEventInput`, `JoinInput`, `UploadMeta`),
  and responses (`JoinResult`, `UploadResult`, `GalleryPage`, `ModerationQueue`,
  `FindMeResult`).
- **Client**: `createBoccClient(baseUrl, options?)`, the `BoccClient` interface,
  `UploadFile` / `ModerationDecision` helper types, and `BoccApiError`.

## Build

This package compiles with `tsup` to ESM, CommonJS, and `.d.ts` files in `dist/`.

```bash
npm run build -w @bocc/shared
```

`exports` is configured so both Next.js (ESM) and Expo / Metro resolve it correctly.

## Usage

### Create a client

```ts
import { createBoccClient } from '@bocc/shared';

const api = createBoccClient(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000');
```

Pass options for auth headers or a custom fetch:

```ts
const api = createBoccClient('https://api.bocc.app', {
  headers: { Authorization: `Bearer ${token}` },
});
```

### Web (Next.js)

```ts
import { createBoccClient, type EventWithJoinUrl } from '@bocc/shared';

const api = createBoccClient('https://api.bocc.app');

const event: EventWithJoinUrl = await api.createEvent({
  name: 'Sarah & Tom',
  type: 'WEDDING',
  faceMatching: true,
});

// Upload from a browser <input type="file" multiple />
async function upload(files: FileList, memberId: string) {
  const result = await api.uploadPhotos(event.id, Array.from(files), { memberId });
  console.log(`uploaded ${result.uploaded}`);
}

const page = await api.getGallery(event.slug, { take: 60 });
```

### Mobile (Expo / React Native)

React Native's `FormData` accepts file descriptors of the shape
`{ uri, name, type }`. The client handles this automatically.

```ts
import { createBoccClient } from '@bocc/shared';
import * as ImagePicker from 'expo-image-picker';

const api = createBoccClient('https://api.bocc.app');

const picked = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true });
if (!picked.canceled) {
  const files = picked.assets.map((a) => ({
    uri: a.uri,
    name: a.fileName ?? 'photo.jpg',
    type: a.mimeType ?? 'image/jpeg',
  }));
  await api.uploadPhotos(eventSlug, files, { memberId });
}

// Selfie match. The result is a discriminated union on `status`.
const res = await api.findMe(eventSlug, selfieFile, memberId);
if (res.status === 'ok') {
  console.log(res.photos.length, 'matched photos');
} else {
  console.log(res.note);
}
```

### Error handling

Non-2xx responses throw `BoccApiError` with `status` and the parsed `body`:

```ts
import { BoccApiError } from '@bocc/shared';

try {
  await api.join(slug, { name: '' });
} catch (err) {
  if (err instanceof BoccApiError) {
    console.error(err.status, err.message);
  }
}
```

## Client methods

| Method | HTTP | Path |
| --- | --- | --- |
| `createEvent` | POST | `/events` |
| `getEvent` | GET | `/events/:idOrSlug` |
| `updateEvent` | PATCH | `/events/:id` |
| `goLive` | POST | `/events/:id/go-live` |
| `getStats` | GET | `/events/:id/stats` |
| `getModeration` | GET | `/events/:id/moderation` |
| `moderate` | POST | `/events/:id/moderation/:photoId/:decision` |
| `join` | POST | `/events/:idOrSlug/join` |
| `uploadPhotos` | POST | `/events/:idOrSlug/photos` (multipart) |
| `getGallery` | GET | `/events/:idOrSlug/gallery` |
| `findMe` | POST | `/events/:idOrSlug/find-me` (multipart) |
