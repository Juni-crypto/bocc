import { Global, Module } from '@nestjs/common';
import { ImmichService } from './immich.service';

@Global()
@Module({
  providers: [ImmichService],
  exports: [ImmichService],
})
export class ImmichModule {}
