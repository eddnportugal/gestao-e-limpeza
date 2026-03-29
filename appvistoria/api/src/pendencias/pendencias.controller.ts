import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { PendenciasService } from './pendencias.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('pendencias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pendencias')
export class PendenciasController {
  constructor(private readonly service: PendenciasService) {}

  @Get('visita/:visitaId')
  listar(@Param('visitaId') visitaId: string) { return this.service.listarPorVisita(visitaId); }

  @Post()
  criar(@Body() dto: any) { return this.service.criar(dto); }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: any) { return this.service.atualizar(id, dto); }
}
