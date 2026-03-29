import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('empresas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Get()
  listar() { return this.empresasService.listar(); }

  @Get(':id')
  buscar(@Param('id') id: string) { return this.empresasService.buscarPorId(id); }

  @Post()
  criar(@Body() dto: any) { return this.empresasService.criar(dto); }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: any) { return this.empresasService.atualizar(id, dto); }
}
