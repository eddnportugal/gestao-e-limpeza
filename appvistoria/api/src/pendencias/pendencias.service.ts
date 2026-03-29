import { Injectable, Inject } from '@nestjs/common';
import { SQL } from '../database/database.module';

@Injectable()
export class PendenciasService {
  constructor(@Inject(SQL) private readonly sql: any) {}

  async listarPorVisita(visitaId: string) {
    return this.sql`
      SELECT * FROM pendencias WHERE visita_id = ${visitaId} ORDER BY prioridade DESC, criado_em
    `;
  }

  async criar(dto: any) {
    const [pendencia] = await this.sql`
      INSERT INTO pendencias (visita_id, resposta_id, titulo, descricao, prioridade, responsavel, prazo)
      VALUES (${dto.visita_id}, ${dto.resposta_id || null}, ${dto.titulo}, ${dto.descricao || null},
              ${dto.prioridade || 'media'}, ${dto.responsavel || null}, ${dto.prazo || null})
      RETURNING *
    `;
    return pendencia;
  }

  async atualizar(id: string, dto: any) {
    const [pendencia] = await this.sql`
      UPDATE pendencias SET
        status = COALESCE(${dto.status || null}, status),
        responsavel = COALESCE(${dto.responsavel || null}, responsavel),
        prazo = COALESCE(${dto.prazo || null}, prazo),
        resolvida_em = CASE WHEN ${dto.status || null} = 'resolvida' THEN NOW() ELSE resolvida_em END,
        atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return pendencia;
  }
}
