import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin client over the Immich REST API. Immich is our private AI + storage
 * engine; only this service talks to it, holding the x-api-key.
 *
 * When IMMICH_ENABLED=false (default in early dev) every method degrades
 * gracefully so the create / join / gallery slice runs without Immich up.
 */
@Injectable()
export class ImmichService {
  private readonly log = new Logger(ImmichService.name);
  private readonly enabled: boolean;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    this.enabled = config.get('IMMICH_ENABLED') === 'true';
    this.baseUrl = (config.get<string>('IMMICH_URL') ?? '').replace(/\/$/, '');
    this.apiKey = config.get<string>('IMMICH_API_KEY') ?? '';
  }

  get isEnabled() {
    return this.enabled;
  }

  private async req<T>(
    path: string,
    init: RequestInit & { rawBody?: boolean } = {},
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'x-api-key': this.apiKey,
        ...(init.rawBody ? {} : { 'Content-Type': 'application/json' }),
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Immich ${path} -> ${res.status} ${text}`);
    }
    return (res.status === 204 ? undefined : await res.json()) as T;
  }

  /** Create the album that backs an event. Returns the album id (or null if disabled). */
  async createAlbum(name: string): Promise<string | null> {
    if (!this.enabled) {
      this.log.debug(`[stub] createAlbum("${name}")`);
      return null;
    }
    const album = await this.req<{ id: string }>('/api/albums', {
      method: 'POST',
      body: JSON.stringify({ albumName: name }),
    });
    return album.id;
  }

  /** Upload one asset, returning its Immich id. Stubbed id when disabled. */
  async uploadAsset(
    file: { buffer: Buffer; originalname: string; mimetype: string },
    takenAt?: Date,
  ): Promise<{ id: string }> {
    if (!this.enabled) {
      return { id: `stub_${Date.now()}_${Math.round(Math.random() * 1e6)}` };
    }
    const form = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
    form.append('assetData', blob, file.originalname);
    form.append('deviceAssetId', `${file.originalname}-${Date.now()}`);
    form.append('deviceId', 'bocc-api');
    const when = (takenAt ?? new Date()).toISOString();
    form.append('fileCreatedAt', when);
    form.append('fileModifiedAt', when);
    return this.req<{ id: string }>('/api/assets', {
      method: 'POST',
      body: form,
      rawBody: true,
    });
  }

  async addAssetsToAlbum(albumId: string, assetIds: string[]): Promise<void> {
    if (!this.enabled || !albumId) return;
    await this.req(`/api/albums/${albumId}/assets`, {
      method: 'PUT',
      body: JSON.stringify({ ids: assetIds }),
    });
  }

  async deleteAsset(assetId: string): Promise<void> {
    if (!this.enabled) return;
    await this.req('/api/assets', {
      method: 'DELETE',
      body: JSON.stringify({ ids: [assetId], force: true }),
    });
  }

  /**
   * Selfie-match primitive (Path A, confirmed by the spike, see SPIKE.md).
   *
   * Immich ranks people by face-embedding cosine distance through
   *   GET /api/people?closestAssetId=<faceId>
   * where `closestAssetId` is misnamed and actually wants a FACE id
   * (asset_face.id), not an asset id. We fetch that face id from
   *   GET /api/faces?id=<selfieAssetId>
   * Immich returns people pre-ordered by similarity; we derive a rank score.
   */
  async rankPeopleForSelfie(selfieAssetId: string): Promise<
    { personId: string; score: number }[] | { notImplemented: true }
  > {
    if (!this.enabled) return { notImplemented: true };

    const faces = await this.req<Array<{ id: string }>>(
      `/api/faces?id=${encodeURIComponent(selfieAssetId)}`,
    );
    const faceId = faces?.[0]?.id;
    if (!faceId) return []; // no detectable face in the selfie

    const ranked = await this.req<{ people: Array<{ id: string }> }>(
      `/api/people?closestAssetId=${encodeURIComponent(faceId)}&size=20`,
    );
    const people = ranked?.people ?? [];
    return people.map((p, i) => ({
      personId: p.id,
      score: people.length > 1 ? 1 - i / (people.length - 1) : 1,
    }));
  }

  /** Stream an asset's bytes (thumbnail preview or original) for our media proxy. */
  async fetchAsset(
    assetId: string,
    kind: 'thumbnail' | 'original',
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    if (!this.enabled) return null;
    const get = (p: string) =>
      fetch(`${this.baseUrl}${p}`, { headers: { 'x-api-key': this.apiKey } });

    let res = await get(
      kind === 'thumbnail'
        ? `/api/assets/${assetId}/thumbnail?size=preview`
        : `/api/assets/${assetId}/original`,
    );
    // Thumbnails are generated async; until ready, fall back to the original so
    // a freshly-uploaded photo still renders instead of showing a broken image.
    if (!res.ok && kind === 'thumbnail') {
      res = await get(`/api/assets/${assetId}/original`);
    }
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, contentType: res.headers.get('content-type') ?? 'image/jpeg' };
  }

  /** CLIP semantic search ("people near the cake"), optionally scoped to an album. */
  async smartSearch(query: string, albumId?: string): Promise<string[]> {
    if (!this.enabled) return [];
    const res = await this.req<{ assets: { items: Array<{ id: string }> } }>(
      '/api/search/smart',
      {
        method: 'POST',
        body: JSON.stringify({
          query,
          ...(albumId ? { albumIds: [albumId] } : {}),
          size: 100,
        }),
      },
    );
    return res?.assets?.items?.map((a) => a.id) ?? [];
  }

  /** Asset ids belonging to a person, optionally scoped to one album. */
  async getPersonAssetIds(personId: string, albumId?: string): Promise<string[]> {
    if (!this.enabled) return [];
    const res = await this.req<{ assets: { items: Array<{ id: string }> } }>(
      '/api/search/metadata',
      {
        method: 'POST',
        body: JSON.stringify({
          personIds: [personId],
          ...(albumId ? { albumIds: [albumId] } : {}),
          size: 1000,
        }),
      },
    );
    return res?.assets?.items?.map((a) => a.id) ?? [];
  }
}
