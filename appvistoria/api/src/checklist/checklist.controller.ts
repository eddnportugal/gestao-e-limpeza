import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('checklist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('checklist')
export class ChecklistController {
  constructor(private readonly service: ChecklistService) {}

  @Get('categorias')
  categorias(@Request() req) { return this.service.listarCategorias(req.user.empresa_id); }

  @Get('categorias/:id/perguntas')
  perguntas(@Param('id') id: string) { return this.service.listarPerguntasPorCategoria(id); }

  @Get('templates')
  templates(@Request() req) { return this.service.listarTemplates(req.user.empresa_id); }

  @Get('templates/:id')
  template(@Param('id') id: string) { return this.service.buscarTemplate(id); }

  @Post('templates')
  criarTemplate(@Body() dto: any, @Request() req) { return this.service.criarTemplate(dto, req.user.empresa_id); }

  @Get('visitas/:visitaId/respostas')
  respostas(@Param('visitaId') visitaId: string) { return this.service.listarRespostas(visitaId); }

  @Post('respostas')
  salvarResposta(@Body() dto: any) { return this.service.salvarResposta(dto); }
}
