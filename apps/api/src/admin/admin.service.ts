import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { UpdateEventDto } from '../events/dto/update-event.dto';

/** Platform-wide read/write for the super admin. No ownership scoping. */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async overview() {
    const [users, events, photos, pendingPhotos, members, storage, faces] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.event.count(),
        this.prisma.photo.count(),
        this.prisma.photo.count({ where: { status: 'PENDING' } }),
        this.prisma.member.count(),
        this.prisma.photo.aggregate({ _sum: { sizeBytes: true } }),
        this.prisma.member.count({ where: { immichPersonId: { not: null } } }),
      ]);
    const byStatus = await this.prisma.event.groupBy({
      by: ['status'],
      _count: true,
    });
    return {
      totals: {
        users,
        events,
        photos,
        pendingPhotos,
        members,
        faces,
        storageBytes: storage._sum.sizeBytes ?? 0,
      },
      eventsByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      recentEvents: await this.listEvents(8),
    };
  }

  async listEvents(take?: number) {
    const events = await this.prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        host: { select: { id: true, email: true, name: true } },
        _count: { select: { members: true, photos: true } },
      },
    });
    return Promise.all(
      events.map(async (e) => {
        const agg = await this.prisma.photo.aggregate({
          where: { eventId: e.id },
          _sum: { sizeBytes: true },
        });
        return {
          id: e.id,
          name: e.name,
          slug: e.slug,
          type: e.type,
          status: e.status,
          visibility: e.visibility,
          createdAt: e.createdAt,
          startsAt: e.startsAt,
          host: e.host,
          photos: e._count.photos,
          crew: e._count.members,
          storageBytes: agg._sum.sizeBytes ?? 0,
        };
      }),
    );
  }

  async eventDetail(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { host: { select: { id: true, email: true, name: true } } },
    });
    if (!event) throw new NotFoundException('Event not found.');
    return { ...event, stats: await this.events.computeStats(id) };
  }

  async updateEvent(id: string, dto: UpdateEventDto) {
    await this.requireEvent(id);
    return this.prisma.event.update({
      where: { id },
      data: { ...dto, startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined },
    });
  }

  async deleteEvent(id: string) {
    await this.requireEvent(id);
    // cascades members + photos. Immich assets are left intact (cleanup TODO).
    await this.prisma.event.delete({ where: { id } });
    return { deleted: true };
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { events: true } },
      },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      events: u._count.events,
    }));
  }

  async setUserRole(id: string, role: Role) {
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  private async requireEvent(id: string) {
    const e = await this.prisma.event.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Event not found.');
  }
}
