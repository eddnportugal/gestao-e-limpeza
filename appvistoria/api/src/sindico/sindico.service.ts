import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SQL } from '../database/database.module';

@Injectable()
export class SindicoService {
  constructor(@Inject(SQL) private readonly sql: any) {}

  async buscarPorToken(token: string) {
    const [conf] = await this.sql`
      SELECT cs.*, v.id as visita_id
      FROM confirmacoes_sindico cs
      JOIN visitas v ON v.id = cs.visita_id
      WHERE cs.token = ${token}
    `;
    if (!conf) throw new NotFoundException('Link inválido ou expirado');

    // Marca como visualizado
    if (!conf.visualizado_em) {
      await this.sql`UPDATE confirmacoes_sindico SET visualizado_em = NOW() WHERE token = ${token}`;
    }

    const [visita] = await this.sql`
      SELECT v.*,
             c.nome as condominio_nome, c.endereco as condominio_endereco,
             u.nome as supervisor_nome
      FROM visitas v
      JOIN condominios c ON c.id = v.condominio_id
      JOIN usuarios u ON u.id = v.supervisor_id
      WHERE v.id = ${conf.visita_id}
    `;

    const respostas = await this.sql`
      SELECT r.*, p.texto as pergunta_texto, cat.nome as categoria_nome
      FROM respostas r
      JOIN perguntas p ON p.id = r.pergunta_id
      JOIN categorias cat ON cat.id = p.categoria_id
      WHERE r.visita_id = ${conf.visita_id}
      ORDER BY cat.ordem, p.ordem
    `;

    const pendencias = await this.sql`
      SELECT * FROM pendencias
      WHERE visita_id = ${conf.visita_id}
      ORDER BY prioridade DESC
    `;

    return { visita, respostas, pendencias };
  }

  async confirmar(token: string, comentario?: string) {
    const [conf] = await this.sql`
      SELECT * FROM confirmacoes_sindico WHERE token = ${token}
    `;
    if (!conf) throw new NotFoundException('Link inválido');

    await this.sql`
      UPDATE confirmacoes_sindico
      SET confirmado_em = NOW(), comentario = ${comentario || null}
      WHERE token = ${token}
    `;

    // Atualiza status da visita para concluida
    await this.sql`
      UPDATE visitas SET status = 'concluida', atualizado_em = NOW()
      WHERE id = ${conf.visita_id}
    `;

    return { ok: true };
  }
}
