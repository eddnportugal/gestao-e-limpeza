import {
  Controller, Post, Body, UploadedFile, UseInterceptors, UseGuards
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('transcrever')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio'))
  async transcrever(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { pergunta: string; condominio: string; categoria: string },
  ) {
    // Salva temp
    const tmpPath = path.join(os.tmpdir(), `audio_${Date.now()}.webm`);
    fs.writeFileSync(tmpPath, file.buffer);

    try {
      const textoBruto = await this.aiService.transcreverAudio(tmpPath);
      const textoCorrigido = await this.aiService.corrigirTextoVistoria(textoBruto, {
        pergunta: body.pergunta || '',
        condominio: body.condominio || '',
        categoria: body.categoria || '',
      });

      return { transcricao_bruta: textoBruto, transcricao_corrigida: textoCorrigido };
    } finally {
      fs.unlinkSync(tmpPath);
    }
  }

  @Post('corrigir')
  corrigir(@Body() body: { texto: string; pergunta: string; condominio: string; categoria: string }) {
    return this.aiService.corrigirTextoVistoria(body.texto, {
      pergunta: body.pergunta,
      condominio: body.condominio,
      categoria: body.categoria,
    }).then(textoCorrigido => ({ texto_corrigido: textoCorrigido }));
  }
}
