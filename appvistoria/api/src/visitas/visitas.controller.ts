import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, Request
} from '@nestjs/common';
import { VisitasService } from './visitas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString } from 'class-validator';

class CriarVisitaDto {
  @IsUUID()
  condominio_id: string;

  @IsOptional()
  @IsUUID()
  template_id?: string;

  @IsOptional()
  @IsString()
  titulo?: string;
}

@ApiTags('visitas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('visitas')
export class VisitasController {
  constructor(private readonly visitasService: VisitasService) {}

  @Get()
  listar(@Request() req, @Query() query: any) {
    const { role, empresa_id, sub } = req.user;
    const filtros = { ...query };
    if (role === 'supervisor') filtros.supervisorId = sub;
    return this.visitasService.listar(empresa_id, filtros);
  }

  @Get('timeline')
  timeline(@Request() req) {
    return this.visitasService.listarTimeline(req.user.empresa_id);
  }

  @Get(':id')
  buscar(@Param('id') id: string, @Request() req) {
    return this.visitasService.buscarPorId(id, req.user.empresa_id);
  }

  @Post()
  criar(@Body() dto: CriarVisitaDto, @Request() req) {
    return this.visitasService.criar(dto, req.user.sub, req.user.empresa_id);
  }

  @Patch(':id/iniciar')
  iniciar(@Param('id') id: string, @Request() req) {
    return this.visitasService.iniciar(id, req.user.sub, req.user.empresa_id);
  }

  @Patch(':id/pausar')
  pausar(@Param('id') id: string, @Request() req) {
    return this.visitasService.pausar(id, req.user.sub, req.user.empresa_id);
  }

  @Patch(':id/finalizar')
  finalizar(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.visitasService.finalizar(id, req.user.sub, req.user.empresa_id, body.observacoes);
  }

  @Patch(':id/aprovar')
  aprovar(@Param('id') id: string, @Request() req) {
    return this.visitasService.aprovar(id, req.user.sub, req.user.empresa_id);
  }

  @Patch(':id/enviar-sindico')
  enviarSindico(@Param('id') id: string, @Request() req) {
    return this.visitasService.enviarSindico(id, req.user.sub, req.user.empresa_id);
  }
}
