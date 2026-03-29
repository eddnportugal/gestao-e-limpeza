import {
  Controller, Post, UploadedFiles, UseInterceptors, Body, UseGuards, Inject
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SQL } from '../database/database.module';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    @Inject(SQL) private readonly sql: any,
  ) {}

  @Post('fotos')
  @UseInterceptors(FilesInterceptor('fotos', 10))
  async uploadFotos(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { visita_id: string; resposta_id?: string; legenda?: string },
  ) {
    const resultados = await Promise.all(
      files.map(async (file) => {
        const { url, thumbnail_url, tamanho_bytes } = await this.uploadService.uploadFoto(
          file.buffer,
          file.mimetype,
          body.visita_id,
        );

        const [foto] = await this.sql`
          INSERT INTO fotos (visita_id, resposta_id, url, thumbnail_url, legenda, tamanho_bytes)
          VALUES (
            ${body.visita_id},
            ${body.resposta_id || null},
            ${url},
            ${thumbnail_url},
            ${body.legenda || null},
            ${tamanho_bytes}
          )
          RETURNING *
        `;

        return foto;
      }),
    );

    return resultados;
  }
}
