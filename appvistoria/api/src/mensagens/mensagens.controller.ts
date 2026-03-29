import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MensagensService } from './mensagens.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('mensagens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mensagens')
export class MensagensController {
  constructor(private readonly service: MensagensService) {}

  @Get('visita/:visitaId')
  listar(@Param('visitaId') visitaId: string) { return this.service.listarPorVisita(visitaId); }

  @Post()
  enviar(@Body() dto: any, @Request() req) { return this.service.enviar(dto, req.user.sub); }
}
