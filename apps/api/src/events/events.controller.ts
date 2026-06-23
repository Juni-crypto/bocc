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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JoinEventDto } from './dto/join-event.dto';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { JwtAuthGuard, JwtPayload } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  // ---- host: create & manage (auth required; host owns the event) ----
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateEventDto, @CurrentUser() user: JwtPayload) {
    return this.events.create(dto, user.sub);
  }

  // NOTE: must be registered before ':idOrSlug' so "mine" is not read as a slug.
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.events.listMine(user.sub);
  }

  @Get(':idOrSlug')
  get(@Param('idOrSlug') idOrSlug: string) {
    return this.events.getPublic(idOrSlug);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto, @CurrentUser() user: JwtPayload) {
    return this.events.update(id, dto, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/go-live')
  goLive(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.events.goLive(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/stats')
  stats(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.events.stats(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/moderation')
  moderation(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.events.moderationQueue(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/moderation/:photoId/:decision')
  moderate(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Param('decision') decision: 'approve' | 'reject',
    @CurrentUser() user: JwtPayload,
  ) {
    return this.events.moderate(id, photoId, decision === 'approve', user.sub);
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
