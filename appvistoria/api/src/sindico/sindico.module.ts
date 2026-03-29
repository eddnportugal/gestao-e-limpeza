import { Module } from '@nestjs/common';
import { SindicoController } from './sindico.controller';
import { SindicoService } from './sindico.service';

@Module({
  controllers: [SindicoController],
  providers: [SindicoService],
})
export class SindicoModule {}
