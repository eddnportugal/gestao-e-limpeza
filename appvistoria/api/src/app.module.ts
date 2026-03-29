import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { EmpresasModule } from './empresas/empresas.module';
import { CondominiosModule } from './condominios/condominios.module';
import { ChecklistModule } from './checklist/checklist.module';
import { VisitasModule } from './visitas/visitas.module';
import { PendenciasModule } from './pendencias/pendencias.module';
import { MensagensModule } from './mensagens/mensagens.module';
import { PdfModule } from './pdf/pdf.module';
import { UploadModule } from './upload/upload.module';
import { AiModule } from './ai/ai.module';
import { HealthController } from './health.controller';
import { GatewayModule } from './gateway/gateway.module';
import { SindicoModule } from './sindico/sindico.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsuariosModule,
    EmpresasModule,
    CondominiosModule,
    ChecklistModule,
    VisitasModule,
    PendenciasModule,
    MensagensModule,
    PdfModule,
    UploadModule,
    AiModule,
    GatewayModule,
    SindicoModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
