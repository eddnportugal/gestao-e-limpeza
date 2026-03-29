import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CondominiosService } from './condominios.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('condominios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('condominios')
export class CondominiosController {
  constructor(private readonly service: CondominiosService) {}

  @Get()
  listar(@Request() req) { return this.service.listar(req.user.empresa_id); }

  @Get(':id')
  buscar(@Param('id') id: string) { return this.service.buscarPorId(id); }

  @Post()
  criar(@Body() dto: any, @Request() req) { return this.service.criar(dto, req.user.empresa_id); }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: any) { return this.service.atualizar(id, dto); }

  @Post(':id/supervisores/:supervisorId')
  vincular(@Param('id') id: string, @Param('supervisorId') supervisorId: string) {
    return this.service.vincularSupervisor(id, supervisorId);
  }

  @Delete(':id/supervisores/:supervisorId')
  desvincular(@Param('id') id: string, @Param('supervisorId') supervisorId: string) {
    return this.service.desvincularSupervisor(id, supervisorId);
  }
}
