// Dependency-free, strongly-typed API client for BOCC.
// Runtime dependencies: only the global `fetch` and `FormData` (available in modern
// browsers, React Native, and Node 18+). No third-party packages.
//
// Routes mirror apps/api/src/events/events.controller.ts (mounted at `/events`).

import type {
  CreateEventInput,
  EventWithJoinUrl,
  FindMeResult,
  GalleryPage,
  JoinInput,
  JoinResult,
  ModerationQueue,
  Stats,
  UpdateEventInput,
  UploadMeta,
  UploadResult,
} from './types.js';

/**
 * A file accepted by the upload helpers. Works in both worlds:
 *  - Browser / web: a `File` or `Blob`.
 *  - React Native / Expo: `{ uri, name, type }`.
 */
export type UploadFile =
  | File
  | Blob
  | { uri: string; name: string; type: string };

/** A moderation decision for a queued photo. */
export type ModerationDecision = 'approve' | 'reject';

/** Optional request-level configuration. */
export interface BoccClientOptions {
  /** Extra headers merged into every request (for example auth tokens). */
  headers?: Record<string, string>;
  /** Custom fetch implementation. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

/** Error thrown when the API returns a non-2xx response. */
export class BoccApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'BoccApiError';
    this.status = status;
    this.body = body;
  }
}

export interface BoccClient {
  // host: create & manage
  createEvent(input: CreateEventInput): Promise<EventWithJoinUrl>;
  getEvent(idOrSlug: string): Promise<EventWithJoinUrl>;
  updateEvent(id: string, input: UpdateEventInput): Promise<EventWithJoinUrl>;
  goLive(id: string): Promise<EventWithJoinUrl>;
  getStats(id: string): Promise<Stats>;
  getModeration(id: string): Promise<ModerationQueue>;
  moderate(
    id: string,
    photoId: string,
    decision: ModerationDecision,
  ): Promise<unknown>;

  // guests
  join(idOrSlug: string, input: JoinInput): Promise<JoinResult>;
  uploadPhotos(
    idOrSlug: string,
    files: UploadFile[],
    meta: UploadMeta,
  ): Promise<UploadResult>;
  getGallery(
    idOrSlug: string,
    params?: { take?: number; cursor?: string },
  ): Promise<GalleryPage>;
  findMe(
    idOrSlug: string,
    selfie: UploadFile,
    memberId: string,
  ): Promise<FindMeResult>;
}

/** Append a single file to a FormData under `field`, handling both web and RN files. */
function appendFile(form: FormData, field: string, file: UploadFile): void {
  if (
    typeof file === 'object' &&
    file !== null &&
    'uri' in file &&
    !(typeof Blob !== 'undefined' && file instanceof Blob)
  ) {
    // React Native file descriptor. RN's FormData accepts this shape directly.
    form.append(field, file as unknown as Blob);
  } else {
    form.append(field, file as Blob);
  }
}

/** Append upload metadata fields, skipping undefined values. */
function appendMeta(form: FormData, meta: UploadMeta): void {
  form.append('memberId', meta.memberId);
  if (meta.takenAt !== undefined) form.append('takenAt', meta.takenAt);
  if (meta.lat !== undefined) form.append('lat', String(meta.lat));
  if (meta.lng !== undefined) form.append('lng', String(meta.lng));
  if (meta.isVideo !== undefined) form.append('isVideo', String(meta.isVideo));
}

/**
 * Create a typed BOCC API client.
 *
 * @param baseUrl Base URL of the API, for example `https://api.bocc.app` or
 *                `http://localhost:3000`. A trailing slash is fine.
 */
export function createBoccClient(
  baseUrl: string,
  options: BoccClientOptions = {},
): BoccClient {
  const root = baseUrl.replace(/\/+$/, '');
  const doFetch = options.fetch ?? fetch;
  const baseHeaders = options.headers ?? {};

  async function parse<T>(res: Response): Promise<T> {
    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    if (!res.ok) {
      const message =
        body && typeof body === 'object' && 'message' in body
          ? String((body as { message: unknown }).message)
          : `Request failed with status ${res.status}`;
      throw new BoccApiError(res.status, message, body);
    }
    return body as T;
  }

  function jsonHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json', ...baseHeaders };
  }

  async function getJson<T>(path: string): Promise<T> {
    const res = await doFetch(`${root}${path}`, { headers: { ...baseHeaders } });
    return parse<T>(res);
  }

  async function sendJson<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await doFetch(`${root}${path}`, {
      method,
      headers: jsonHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return parse<T>(res);
  }

  async function sendForm<T>(path: string, form: FormData): Promise<T> {
    // Do NOT set Content-Type: the runtime sets the multipart boundary itself.
    const res = await doFetch(`${root}${path}`, {
      method: 'POST',
      headers: { ...baseHeaders },
      body: form,
    });
    return parse<T>(res);
  }

  const enc = encodeURIComponent;

  return {
    createEvent(input) {
      return sendJson<EventWithJoinUrl>('POST', '/events', input);
    },

    getEvent(idOrSlug) {
      return getJson<EventWithJoinUrl>(`/events/${enc(idOrSlug)}`);
    },

    updateEvent(id, input) {
      return sendJson<EventWithJoinUrl>('PATCH', `/events/${enc(id)}`, input);
    },

    goLive(id) {
      return sendJson<EventWithJoinUrl>('POST', `/events/${enc(id)}/go-live`);
    },

    getStats(id) {
      return getJson<Stats>(`/events/${enc(id)}/stats`);
    },

    getModeration(id) {
      return getJson<ModerationQueue>(`/events/${enc(id)}/moderation`);
    },

    moderate(id, photoId, decision) {
      return sendJson<unknown>(
        'POST',
        `/events/${enc(id)}/moderation/${enc(photoId)}/${enc(decision)}`,
      );
    },

    join(idOrSlug, input) {
      return sendJson<JoinResult>('POST', `/events/${enc(idOrSlug)}/join`, input);
    },

    uploadPhotos(idOrSlug, files, meta) {
      const form = new FormData();
      for (const file of files) appendFile(form, 'files', file);
      appendMeta(form, meta);
      return sendForm<UploadResult>(`/events/${enc(idOrSlug)}/photos`, form);
    },

    getGallery(idOrSlug, params = {}) {
      const qs = new URLSearchParams();
      if (params.take !== undefined) qs.set('take', String(params.take));
      if (params.cursor !== undefined) qs.set('cursor', params.cursor);
      const query = qs.toString();
      return getJson<GalleryPage>(
        `/events/${enc(idOrSlug)}/gallery${query ? `?${query}` : ''}`,
      );
    },

    findMe(idOrSlug, selfie, memberId) {
      const form = new FormData();
      appendFile(form, 'selfie', selfie);
      form.append('memberId', memberId);
      return sendForm<FindMeResult>(`/events/${enc(idOrSlug)}/find-me`, form);
    },
  };
}
