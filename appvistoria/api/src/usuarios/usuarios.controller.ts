import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  listar(@Request() req) { return this.usuariosService.listar(req.user.empresa_id); }

  @Get(':id')
  buscar(@Param('id') id: string) { return this.usuariosService.buscarPorId(id); }

  @Post()
  criar(@Body() dto: any, @Request() req) { return this.usuariosService.criar(dto, req.user.empresa_id); }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: any) { return this.usuariosService.atualizar(id, dto); }
}
