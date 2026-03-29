import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp';

@Injectable()
export class UploadService {
  private s3: S3Client;
  private bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get('HETZNER_S3_BUCKET');
    this.s3 = new S3Client({
      endpoint: config.get('HETZNER_S3_ENDPOINT'),
      region: 'eu-central-1',
      credentials: {
        accessKeyId: config.get('HETZNER_S3_ACCESS_KEY'),
        secretAccessKey: config.get('HETZNER_S3_SECRET_KEY'),
      },
      forcePathStyle: true,
    });
  }

  async uploadFoto(
    buffer: Buffer,
    mimetype: string,
    visitaId: string,
  ): Promise<{ url: string; thumbnail_url: string; tamanho_bytes: number }> {
    const id = uuidv4();
    const key = `visitas/${visitaId}/${id}.jpg`;
    const thumbKey = `visitas/${visitaId}/thumb_${id}.jpg`;

    // Comprime imagem original
    const imgBuffer = await sharp(buffer)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Gera thumbnail
    const thumbBuffer = await sharp(buffer)
      .resize(400, 400, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer();

    await Promise.all([
      this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: imgBuffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      })),
      this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: thumbKey,
        Body: thumbBuffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      })),
    ]);

    const baseUrl = `${this.config.get('HETZNER_S3_ENDPOINT')}/${this.bucket}`;
    return {
      url: `${baseUrl}/${key}`,
      thumbnail_url: `${baseUrl}/${thumbKey}`,
      tamanho_bytes: imgBuffer.length,
    };
  }

  async deletarFoto(url: string) {
    const key = url.split(`${this.bucket}/`)[1];
    if (!key) return;
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
