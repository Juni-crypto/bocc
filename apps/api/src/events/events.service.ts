import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Event, MemberRole, Photo, PhotoStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ImmichService } from '../immich/immich.service';
import { slugify } from '../common/slug';
import { haversineMeters } from '../common/geo';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JoinEventDto } from './dto/join-event.dto';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { JwtPayload } from '../auth/jwt.guard';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly immich: ImmichService,
  ) {}

  // ---- creation & management -------------------------------------------------

  async create(dto: CreateEventDto, hostUserId: string) {
    const slug = slugify(dto.name);
    const albumId = await this.immich.createAlbum(dto.name);

    const event = await this.prisma.event.create({
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        slug,
        immichAlbumId: albumId,
        hostUserId,
      },
    });
    return this.withJoinUrl(event);
  }

  async listMine(userId: string) {
    const events = await this.prisma.event.findMany({
      where: { hostUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(
      events.map(async (e) => ({
        ...this.withJoinUrl(e),
        stats: await this.computeStats(e.id),
      })),
    );
  }

  async update(id: string, dto: UpdateEventDto, userId: string) {
    await this.ownedOrThrow(id, userId);
    const event = await this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      },
    });
    return this.withJoinUrl(event);
  }

  async goLive(id: string, userId: string) {
    await this.ownedOrThrow(id, userId);
    const event = await this.prisma.event.update({
      where: { id },
      data: { status: 'LIVE' },
    });
    return this.withJoinUrl(event);
  }

  /** Host closes the event: status -> ENDED, which blocks further uploads. */
  async end(id: string, userId: string) {
    await this.ownedOrThrow(id, userId);
    const event = await this.prisma.event.update({
      where: { id },
      data: { status: 'ENDED' },
    });
    return this.withJoinUrl(event);
  }

  /** Delete one photo (event host, or any admin). Removes the Immich asset too. */
  async deletePhoto(eventId: string, photoId: string, user: JwtPayload) {
    if (user.role === 'ADMIN') {
      await this.getOrThrow(eventId);
    } else {
      await this.ownedOrThrow(eventId, user.sub);
    }
    const photo = await this.prisma.photo.findFirst({
      where: { id: photoId, eventId },
    });
    if (!photo) throw new NotFoundException('Photo not found.');
    await this.immich.deleteAsset(photo.immichAssetId).catch(() => undefined);
    await this.prisma.photo.delete({ where: { id: photo.id } });
    return { deleted: true, id: photo.id };
  }

  /**
   * Faces detected across the event album. Each person carries a thumbnail
   * (proxied) and how many of the event's photos they appear in. Populates as
   * Immich finishes its background face-detection pass.
   */
  async listPeople(idOrSlug: string) {
    const event = await this.resolve(idOrSlug);
    if (!this.immich.isEnabled || !event.immichAlbumId) return { people: [] };
    const all = await this.immich.listPeople();
    const people: Array<{
      id: string;
      name: string | null;
      photoCount: number;
      thumbUrl: string;
    }> = [];
    for (const person of all) {
      const ids = await this.immich.getPersonAssetIds(person.id, event.immichAlbumId);
      if (ids.length) {
        people.push({
          id: person.id,
          name: person.name,
          photoCount: ids.length,
          thumbUrl: `${this.publicBase}/api/events/${event.id}/people/${person.id}/thumb`,
        });
      }
    }
    people.sort((a, b) => b.photoCount - a.photoCount);
    return { people };
  }

  /** Only the photos a given detected person appears in, within this event. */
  async personPhotos(idOrSlug: string, personId: string) {
    const event = await this.resolve(idOrSlug);
    if (!this.immich.isEnabled || !event.immichAlbumId) {
      return { personId, count: 0, photos: [] };
    }
    const assetIds = await this.immich.getPersonAssetIds(
      personId,
      event.immichAlbumId,
    );
    const photos = await this.prisma.photo.findMany({
      where: {
        eventId: event.id,
        status: 'APPROVED',
        immichAssetId: { in: assetIds },
      },
      orderBy: { createdAt: 'desc' },
      include: { member: { select: { name: true } } },
    });
    return {
      personId,
      count: photos.length,
      photos: photos.map((p) => this.publicPhoto(p)),
    };
  }

  /** Fetch a face cluster's thumbnail bytes for the people proxy. */
  async personMedia(eventId: string, personId: string) {
    await this.getOrThrow(eventId);
    const media = await this.immich.fetchPersonThumbnail(personId);
    if (!media) throw new NotFoundException('Person thumbnail unavailable.');
    return media;
  }

  /**
   * Everything a returning guest can see by phone: each event they joined plus
   * the photos they uploaded there. No account needed; the phone is the key.
   */
  async myStuff(phone: string) {
    const p = (phone ?? '').trim();
    if (!p) return { phone: '', events: [] };
    const members = await this.prisma.member.findMany({
      where: { phone: p },
      include: { event: true },
      orderBy: { createdAt: 'desc' },
    });
    // Collapse to one entry per event (a phone may have joined the same event
    // more than once) and union that phone's photos across those member rows.
    const grouped = new Map<
      string,
      {
        event: (typeof members)[number]['event'];
        memberIds: string[];
        memberName: string;
      }
    >();
    for (const m of members) {
      const cur = grouped.get(m.eventId);
      if (cur) cur.memberIds.push(m.id);
      else
        grouped.set(m.eventId, {
          event: m.event,
          memberIds: [m.id],
          memberName: m.name,
        });
    }
    const events: Array<{
      event: ReturnType<EventsService['withJoinUrl']>;
      memberName: string;
      photos: ReturnType<EventsService['publicPhoto']>[];
    }> = [];
    for (const { event, memberIds, memberName } of grouped.values()) {
      const photos = await this.prisma.photo.findMany({
        where: {
          eventId: event.id,
          memberId: { in: memberIds },
          status: 'APPROVED',
        },
        orderBy: { createdAt: 'desc' },
        include: { member: { select: { name: true } } },
      });
      events.push({
        event: this.withJoinUrl(event),
        memberName,
        photos: photos.map((ph) => this.publicPhoto(ph)),
      });
    }
    return { phone: p, events };
  }

  async getPublic(idOrSlug: string) {
    const event = await this.resolve(idOrSlug);
    // public, non-sensitive counts so the guest gallery header is accurate
    // without needing the owner-only /stats endpoint.
    const [photoCount, crew] = await Promise.all([
      this.prisma.photo.count({ where: { eventId: event.id, status: 'APPROVED' } }),
      this.prisma.member.count({ where: { eventId: event.id } }),
    ]);
    return { ...this.withJoinUrl(event), photoCount, crew };
  }

  async stats(id: string, userId: string) {
    await this.ownedOrThrow(id, userId);
    return this.computeStats(id);
  }

  /** Stats for one event (crew, photo counts, faces, total storage). */
  async computeStats(id: string) {
    const [crew, photos, pending, agg, faces] = await Promise.all([
      this.prisma.member.count({ where: { eventId: id } }),
      this.prisma.photo.count({ where: { eventId: id, status: 'APPROVED' } }),
      this.prisma.photo.count({ where: { eventId: id, status: 'PENDING' } }),
      this.prisma.photo.aggregate({ where: { eventId: id }, _sum: { sizeBytes: true } }),
      this.prisma.member.count({ where: { eventId: id, immichPersonId: { not: null } } }),
    ]);
    return { crew, photos, pending, faces, storageBytes: agg._sum.sizeBytes ?? 0 };
  }

  // ---- guests ----------------------------------------------------------------

  async join(idOrSlug: string, dto: JoinEventDto) {
    const event = await this.resolve(idOrSlug);

    // Idempotent by phone: a returning guest with the same phone re-uses their
    // existing membership instead of creating a duplicate member each time.
    const phone = dto.phone?.trim();
    if (phone) {
      const existing = await this.prisma.member.findFirst({
        where: { eventId: event.id, phone },
        orderBy: { createdAt: 'asc' },
      });
      if (existing) {
        return { member: existing, event: this.withJoinUrl(event) };
      }
    }

    if (event.requireName && !dto.name?.trim()) {
      throw new BadRequestException('This event requires a name to join.');
    }
    if (event.faceMatching && !dto.consentFaceMatch) {
      throw new BadRequestException(
        'Face matching is on for this event; consent is required to join.',
      );
    }

    const member = await this.prisma.member.create({
      data: {
        eventId: event.id,
        name: dto.name?.trim() || 'Guest',
        phone: dto.phone?.trim() || null,
        role: MemberRole.GUEST,
        consentFaceMatch: !!dto.consentFaceMatch,
        consentAt: dto.consentFaceMatch ? new Date() : null,
      },
    });
    return { member, event: this.withJoinUrl(event) };
  }

  // ---- uploads ---------------------------------------------------------------

  async uploadPhotos(
    idOrSlug: string,
    files: Express.Multer.File[],
    dto: UploadPhotoDto,
  ) {
    const event = await this.resolve(idOrSlug);
    if (!files?.length) throw new BadRequestException('No files uploaded.');

    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, eventId: event.id },
    });
    if (!member) throw new ForbiddenException('Not a member of this event.');

    this.assertUploadWindowOpen(event);
    await this.assertUnderCap(event, member.id, files.length);

    const lat = dto.lat;
    const lng = dto.lng;
    this.assertWithinGeofence(event, lat, lng);

    const moderated = event.moderationQueue || event.hostApproval;
    const created: Photo[] = [];
    for (const file of files) {
      const asset = await this.immich.uploadAsset(
        file,
        dto.takenAt ? new Date(dto.takenAt) : undefined,
      );
      if (event.immichAlbumId) {
        await this.immich.addAssetsToAlbum(event.immichAlbumId, [asset.id]);
      }
      // Immich dedups by checksum, so the same file yields the same asset id.
      // Upsert keeps that idempotent instead of failing on the unique asset id.
      const photo = await this.prisma.photo.upsert({
        where: { immichAssetId: asset.id },
        create: {
          eventId: event.id,
          memberId: member.id,
          immichAssetId: asset.id,
          status: moderated ? PhotoStatus.PENDING : PhotoStatus.APPROVED,
          isVideo: !!dto.isVideo,
          sizeBytes: file.size ?? 0,
          takenAt: dto.takenAt ? new Date(dto.takenAt) : undefined,
          lat,
          lng,
        },
        update: { eventId: event.id, memberId: member.id, sizeBytes: file.size ?? 0 },
      });
      created.push(photo);
    }
    return { uploaded: created.length, photos: created };
  }

  // ---- gallery & moderation --------------------------------------------------

  async gallery(idOrSlug: string, take = 60, cursor?: string) {
    const event = await this.resolve(idOrSlug);
    const photos = await this.prisma.photo.findMany({
      where: { eventId: event.id, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 200),
      include: { member: { select: { name: true } } },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    return {
      photos: photos.map((p) => this.publicPhoto(p)),
      nextCursor: photos.length ? photos[photos.length - 1].id : null,
    };
  }

  /** Semantic (CLIP) search within the event, via Immich, mapped to our photos. */
  async search(idOrSlug: string, q: string) {
    const event = await this.resolve(idOrSlug);
    const query = (q ?? '').trim();
    if (!query) return { query: '', photos: [], count: 0 };
    if (!this.immich.isEnabled || !event.semanticSearch) {
      return {
        query,
        photos: [],
        count: 0,
        note: this.immich.isEnabled
          ? 'Search is turned off for this event.'
          : 'Search needs the AI engine enabled.',
      };
    }
    const ranked = await this.immich.smartSearch(query, event.immichAlbumId ?? undefined);
    const order = new Map(ranked.map((id, i) => [id, i]));
    const photos = await this.prisma.photo.findMany({
      where: { eventId: event.id, status: 'APPROVED', immichAssetId: { in: ranked } },
      include: { member: { select: { name: true } } },
    });
    photos.sort(
      (a, b) =>
        (order.get(a.immichAssetId) ?? 1e9) - (order.get(b.immichAssetId) ?? 1e9),
    );
    return { query, count: photos.length, photos: photos.map((p) => this.publicPhoto(p)) };
  }

  async moderationQueue(id: string, userId: string) {
    await this.ownedOrThrow(id, userId);
    const photos = await this.prisma.photo.findMany({
      where: { eventId: id, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    return { pending: photos.length, photos: photos.map((p) => this.publicPhoto(p)) };
  }

  async moderate(id: string, photoId: string, approve: boolean, userId: string) {
    await this.ownedOrThrow(id, userId);
    return this.prisma.photo.update({
      where: { id: photoId },
      data: { status: approve ? PhotoStatus.APPROVED : PhotoStatus.REJECTED },
    });
  }

  // ---- selfie match (spike pending) -----------------------------------------

  async findMe(idOrSlug: string, selfie: Express.Multer.File, memberId: string) {
    const event = await this.resolve(idOrSlug);
    if (!event.faceMatching) {
      throw new BadRequestException('Face matching is disabled for this event.');
    }
    if (!selfie) throw new BadRequestException('No selfie uploaded.');

    // Upload selfie -> rank people -> resolve to this event's photos -> delete selfie.
    const asset = await this.immich.uploadAsset(selfie);
    const ranked = await this.immich.rankPeopleForSelfie(asset.id);
    await this.immich.deleteAsset(asset.id);

    if ('notImplemented' in ranked) {
      return {
        status: 'not_implemented',
        note:
          'Selfie ranking needs Immich enabled (IMMICH_ENABLED=true). ' +
          'Path A wiring is in place: upload -> faces -> rank people -> resolve assets -> delete.',
        memberId,
        eventId: event.id,
      };
    }

    const best = ranked[0];
    if (!best) {
      return { status: 'no_match', note: 'No face detected in the selfie.', photos: [] };
    }

    // remember which face cluster this guest resolved to
    if (memberId) {
      await this.prisma.member
        .update({ where: { id: memberId }, data: { immichPersonId: best.personId } })
        .catch(() => undefined);
    }

    // resolve that person's assets within this event's album, intersect with our photos
    const assetIds = new Set(
      await this.immich.getPersonAssetIds(best.personId, event.immichAlbumId ?? undefined),
    );
    const photos = await this.prisma.photo.findMany({
      where: { eventId: event.id, status: 'APPROVED', immichAssetId: { in: [...assetIds] } },
      orderBy: { createdAt: 'desc' },
      include: { member: { select: { name: true } } },
    });
    return {
      status: 'ok',
      match: best,
      count: photos.length,
      photos: photos.map((p) => this.publicPhoto(p)),
    };
  }

  // ---- helpers ---------------------------------------------------------------

  private assertUploadWindowOpen(event: Event) {
    if (event.status === 'ENDED') {
      throw new ForbiddenException('This event has ended; uploads are closed.');
    }
    if (event.uploadWindow === 'ALWAYS') return;
    if (event.uploadWindow === 'DURING_EVENT') {
      if (event.status !== 'LIVE') {
        throw new ForbiddenException('Uploads are only open during the event.');
      }
      return;
    }
    // DAYS_AFTER
    if (event.startsAt) {
      const closes = new Date(event.startsAt);
      closes.setDate(closes.getDate() + event.uploadDaysAfter);
      if (Date.now() > closes.getTime()) {
        throw new ForbiddenException('The upload window for this event has closed.');
      }
    }
  }

  private async assertUnderCap(event: Event, memberId: string, incoming: number) {
    if (event.perGuestCap > 0) {
      const mine = await this.prisma.photo.count({
        where: { eventId: event.id, memberId },
      });
      if (mine + incoming > event.perGuestCap) {
        throw new ForbiddenException(
          `Per-guest cap reached (${event.perGuestCap}). You have ${mine}.`,
        );
      }
    }
    if (event.totalCap && event.totalCap > 0) {
      const total = await this.prisma.photo.count({ where: { eventId: event.id } });
      if (total + incoming > event.totalCap) {
        throw new ForbiddenException('This event has reached its total photo cap.');
      }
    }
  }

  private assertWithinGeofence(event: Event, lat?: number, lng?: number) {
    if (!event.geofenceEnabled) return;
    if (
      event.geofenceLat == null ||
      event.geofenceLng == null ||
      lat == null ||
      lng == null
    ) {
      throw new BadRequestException(
        'This event is geofenced; photos must include a location.',
      );
    }
    const dist = haversineMeters(event.geofenceLat, event.geofenceLng, lat, lng);
    if (dist > event.geofenceRadiusM) {
      throw new ForbiddenException(
        `Photo is outside the venue geofence (${Math.round(dist)}m away).`,
      );
    }
  }

  private async resolve(idOrSlug: string): Promise<Event> {
    const event = await this.prisma.event.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    if (!event) throw new NotFoundException('Event not found.');
    return event;
  }

  private async getOrThrow(id: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found.');
    return event;
  }

  private async ownedOrThrow(id: string, userId: string): Promise<Event> {
    const event = await this.getOrThrow(id);
    if (event.hostUserId !== userId) {
      throw new ForbiddenException('You do not own this event.');
    }
    return event;
  }

  private get webBase() {
    return (process.env.WEB_PUBLIC_URL ?? 'https://bocc.app').replace(/\/$/, '');
  }

  private withJoinUrl(event: Event) {
    return {
      ...event,
      joinUrl: `${this.webBase}/e/${event.slug}`,
    };
  }

  private get publicBase() {
    return (process.env.API_PUBLIC_URL ?? 'http://localhost:4000').replace(/\/$/, '');
  }

  private publicPhoto(
    p: Prisma.PhotoGetPayload<{}> & { member?: { name: string } | null },
  ) {
    return {
      id: p.id,
      assetId: p.immichAssetId,
      isVideo: p.isVideo,
      takenAt: p.takenAt,
      lat: p.lat,
      lng: p.lng,
      uploaderName: p.member?.name ?? null,
      // absolute so the web/mobile clients load them directly from us; we proxy Immich.
      thumbUrl: `${this.publicBase}/api/events/${p.eventId}/photos/${p.id}/thumb`,
      originalUrl: `${this.publicBase}/api/events/${p.eventId}/photos/${p.id}/original`,
    };
  }

  /** Fetch a photo's bytes (thumbnail or original) from Immich for the media proxy. */
  async photoMedia(eventId: string, photoId: string, kind: 'thumbnail' | 'original') {
    const photo = await this.prisma.photo.findFirst({ where: { id: photoId, eventId } });
    if (!photo) throw new NotFoundException('Photo not found.');
    const media = await this.immich.fetchAsset(photo.immichAssetId, kind);
    if (!media) throw new NotFoundException('Media unavailable.');
    return media;
  }
}
