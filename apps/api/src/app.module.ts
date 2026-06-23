import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ImmichModule } from './immich/immich.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { AdminModule } from './admin/admin.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ImmichModule,
    AuthModule,
    EventsModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
