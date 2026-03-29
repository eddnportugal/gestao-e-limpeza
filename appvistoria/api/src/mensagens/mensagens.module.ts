import { Module } from '@nestjs/common';
import { MensagensController } from './mensagens.controller';
import { MensagensService } from './mensagens.service';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [GatewayModule],
  controllers: [MensagensController],
  providers: [MensagensService],
})
export class MensagensModule {}
