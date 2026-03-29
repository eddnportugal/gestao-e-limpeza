import { Module } from '@nestjs/common';
import { VisitasController } from './visitas.controller';
import { VisitasService } from './visitas.service';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [GatewayModule],
  controllers: [VisitasController],
  providers: [VisitasService],
  exports: [VisitasService],
})
export class VisitasModule {}
