import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { SindicoService } from './sindico.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('sindico')
@Controller('sindico')
export class SindicoController {
  constructor(private readonly sindicoService: SindicoService) {}

  @Get(':token')
  buscar(@Param('token') token: string) {
    return this.sindicoService.buscarPorToken(token);
  }

  @Post(':token/confirmar')
  confirmar(@Param('token') token: string, @Body() body: { comentario?: string }) {
    return this.sindicoService.confirmar(token, body.comentario);
  }
}
