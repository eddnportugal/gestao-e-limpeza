import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SQL } from '../database/database.module';

@Injectable()
export class ChecklistService {
  constructor(@Inject(SQL) private readonly sql: any) {}

  async listarCategorias(empresaId?: string) {
    return this.sql`
      SELECT c.*, COUNT(p.id) as total_perguntas
      FROM categorias c
      LEFT JOIN perguntas p ON p.categoria_id = c.id AND p.ativo = true
      WHERE (c.empresa_id IS NULL OR c.empresa_id = ${empresaId || null})
        AND c.ativo = true
      GROUP BY c.id
      ORDER BY c.ordem, c.nome
    `;
  }

  async listarPerguntasPorCategoria(categoriaId: string) {
    return this.sql`
      SELECT * FROM perguntas
      WHERE categoria_id = ${categoriaId} AND ativo = true
      ORDER BY ordem
    `;
  }

  async listarTemplates(empresaId: string) {
    return this.sql`
      SELECT t.*, COUNT(tp.id) as total_perguntas
      FROM checklist_templates t
      LEFT JOIN template_perguntas tp ON tp.template_id = t.id
      WHERE t.empresa_id = ${empresaId} AND t.ativo = true
      GROUP BY t.id
      ORDER BY t.nome
    `;
  }

  async buscarTemplate(id: string) {
    const [template] = await this.sql`SELECT * FROM checklist_templates WHERE id = ${id}`;
    if (!template) throw new NotFoundException('Template não encontrado');

    const perguntas = await this.sql`
      SELECT tp.ordem, tp.obrigatoria, p.*, c.nome as categoria_nome
      FROM template_perguntas tp
      JOIN perguntas p ON p.id = tp.pergunta_id
      JOIN categorias c ON c.id = p.categoria_id
      WHERE tp.template_id = ${id}
      ORDER BY tp.ordem
    `;

    return { ...template, perguntas };
  }

  async criarTemplate(dto: any, empresaId: string) {
    const [template] = await this.sql`
      INSERT INTO checklist_templates (empresa_id, nome, descricao)
      VALUES (${empresaId}, ${dto.nome}, ${dto.descricao || null})
      RETURNING *
    `;

    if (dto.perguntas?.length) {
      await this.sql`
        INSERT INTO template_perguntas ${this.sql(
          dto.perguntas.map((p: any, i: number) => ({
            template_id: template.id,
            pergunta_id: p.pergunta_id,
            ordem: p.ordem ?? i + 1,
            obrigatoria: p.obrigatoria ?? true,
          }))
        )}
      `;
    }

    return this.buscarTemplate(template.id);
  }

  async listarRespostas(visitaId: string) {
    return this.sql`
      SELECT r.*, p.texto as pergunta_texto, c.nome as categoria_nome
      FROM respostas r
      JOIN perguntas p ON p.id = r.pergunta_id
      JOIN categorias c ON c.id = p.categoria_id
      WHERE r.visita_id = ${visitaId}
      ORDER BY c.ordem, p.ordem
    `;
  }

  async salvarResposta(dto: any) {
    const [resposta] = await this.sql`
      INSERT INTO respostas (visita_id, pergunta_id, resultado, observacao, audio_url, transcricao_bruta, transcricao_corrigida)
      VALUES (${dto.visita_id}, ${dto.pergunta_id}, ${dto.resultado || null}, ${dto.observacao || null},
              ${dto.audio_url || null}, ${dto.transcricao_bruta || null}, ${dto.transcricao_corrigida || null})
      ON CONFLICT (visita_id, pergunta_id) DO UPDATE SET
        resultado = EXCLUDED.resultado,
        observacao = EXCLUDED.observacao,
        audio_url = EXCLUDED.audio_url,
        transcricao_bruta = EXCLUDED.transcricao_bruta,
        transcricao_corrigida = EXCLUDED.transcricao_corrigida,
        respondido_em = NOW()
      RETURNING *
    `;
    return resposta;
  }
}
