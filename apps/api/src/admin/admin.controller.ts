import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard, JwtPayload } from '../auth/jwt.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateEventDto } from '../events/dto/update-event.dto';
import { CreateUserDto } from './dto/create-user.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('events')
  events() {
    return this.admin.listEvents();
  }

  @Get('events/:id')
  eventDetail(@Param('id') id: string) {
    return this.admin.eventDetail(id);
  }

  @Patch('events/:id')
  updateEvent(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.admin.updateEvent(id, dto);
  }

  @Delete('events/:id')
  deleteEvent(@Param('id') id: string) {
    return this.admin.deleteEvent(id);
  }

  @Get('users')
  users() {
    return this.admin.listUsers();
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.admin.createUser(dto);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.admin.deleteUser(id, user.sub);
  }

  @Patch('users/:id/role')
  setRole(@Param('id') id: string, @Body('role') role: Role) {
    if (role !== 'USER' && role !== 'ADMIN') {
      throw new BadRequestException('role must be USER or ADMIN.');
    }
    return this.admin.setUserRole(id, role);
  }
}
