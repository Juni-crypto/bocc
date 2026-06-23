import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule], // for EventsService.computeStats
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
