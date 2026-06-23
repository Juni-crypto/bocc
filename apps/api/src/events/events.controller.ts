import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JoinEventDto } from './dto/join-event.dto';
import { UploadPhotoDto } from './dto/upload-photo.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  // ---- host: create & manage ----
  @Post()
  create(@Body() dto: CreateEventDto) {
    return this.events.create(dto);
  }

  @Get(':idOrSlug')
  get(@Param('idOrSlug') idOrSlug: string) {
    return this.events.getPublic(idOrSlug);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.events.update(id, dto);
  }

  @Post(':id/go-live')
  goLive(@Param('id') id: string) {
    return this.events.goLive(id);
  }

  @Get(':id/stats')
  stats(@Param('id') id: string) {
    return this.events.stats(id);
  }

  @Get(':id/moderation')
  moderation(@Param('id') id: string) {
    return this.events.moderationQueue(id);
  }

  @Post(':id/moderation/:photoId/:decision')
  moderate(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Param('decision') decision: 'approve' | 'reject',
  ) {
    return this.events.moderate(id, photoId, decision === 'approve');
  }

  // ---- guests ----
  @Post(':idOrSlug/join')
  join(@Param('idOrSlug') idOrSlug: string, @Body() dto: JoinEventDto) {
    return this.events.join(idOrSlug, dto);
  }

  @Post(':idOrSlug/photos')
  @UseInterceptors(FilesInterceptor('files', 20))
  upload(
    @Param('idOrSlug') idOrSlug: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadPhotoDto,
  ) {
    return this.events.uploadPhotos(idOrSlug, files, dto);
  }

  @Get(':eventId/photos/:photoId/thumb')
  async thumb(
    @Param('eventId') eventId: string,
    @Param('photoId') photoId: string,
    @Res() res: Response,
  ) {
    const m = await this.events.photoMedia(eventId, photoId, 'thumbnail');
    res.set('Content-Type', m.contentType).set('Cache-Control', 'public, max-age=86400');
    res.send(m.buffer);
  }

  @Get(':eventId/photos/:photoId/original')
  async original(
    @Param('eventId') eventId: string,
    @Param('photoId') photoId: string,
    @Res() res: Response,
  ) {
    const m = await this.events.photoMedia(eventId, photoId, 'original');
    res.set('Content-Type', m.contentType).set('Cache-Control', 'public, max-age=86400');
    res.send(m.buffer);
  }

  @Get(':idOrSlug/gallery')
  gallery(
    @Param('idOrSlug') idOrSlug: string,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.events.gallery(idOrSlug, take ? +take : 60, cursor);
  }

  @Post(':idOrSlug/find-me')
  @UseInterceptors(FileInterceptor('selfie'))
  findMe(
    @Param('idOrSlug') idOrSlug: string,
    @UploadedFile() selfie: Express.Multer.File,
    @Body('memberId') memberId: string,
  ) {
    return this.events.findMe(idOrSlug, selfie, memberId);
  }
}
