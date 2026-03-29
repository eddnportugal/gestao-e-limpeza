import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SQL } from '../database/database.module';

@Injectable()
export class CondominiosService {
  constructor(@Inject(SQL) private readonly sql: any) {}

  async listar(empresaId: string) {
    return this.sql`
      SELECT c.*,
             COUNT(DISTINCT sc.supervisor_id) as total_supervisores,
             COUNT(DISTINCT v.id) FILTER (WHERE v.status NOT IN ('concluida')) as visitas_ativas
      FROM condominios c
      LEFT JOIN supervisor_condominios sc ON sc.condominio_id = c.id
      LEFT JOIN visitas v ON v.condominio_id = c.id
      WHERE c.empresa_id = ${empresaId}
      GROUP BY c.id
      ORDER BY c.nome
    `;
  }

  async buscarPorId(id: string) {
    const [cond] = await this.sql`
      SELECT c.*,
             json_agg(json_build_object('id', u.id, 'nome', u.nome, 'email', u.email))
               FILTER (WHERE u.id IS NOT NULL) as supervisores
      FROM condominios c
      LEFT JOIN supervisor_condominios sc ON sc.condominio_id = c.id
      LEFT JOIN usuarios u ON u.id = sc.supervisor_id
      WHERE c.id = ${id}
      GROUP BY c.id
    `;
    if (!cond) throw new NotFoundException('Condomínio não encontrado');
    return cond;
  }

  async criar(dto: any, empresaId: string) {
    const [cond] = await this.sql`
      INSERT INTO condominios (empresa_id, nome, endereco, cidade, estado, cep, sindico_nome, sindico_email, sindico_telefone, total_unidades)
      VALUES (${empresaId}, ${dto.nome}, ${dto.endereco}, ${dto.cidade || null}, ${dto.estado || null},
              ${dto.cep || null}, ${dto.sindico_nome || null}, ${dto.sindico_email || null},
              ${dto.sindico_telefone || null}, ${dto.total_unidades || null})
      RETURNING *
    `;
    return cond;
  }

  async atualizar(id: string, dto: any) {
    const [cond] = await this.sql`
      UPDATE condominios SET
        nome = COALESCE(${dto.nome || null}, nome),
        endereco = COALESCE(${dto.endereco || null}, endereco),
        cidade = COALESCE(${dto.cidade || null}, cidade),
        estado = COALESCE(${dto.estado || null}, estado),
        sindico_nome = COALESCE(${dto.sindico_nome || null}, sindico_nome),
        sindico_email = COALESCE(${dto.sindico_email || null}, sindico_email),
        sindico_telefone = COALESCE(${dto.sindico_telefone || null}, sindico_telefone),
        total_unidades = COALESCE(${dto.total_unidades || null}, total_unidades),
        ativo = COALESCE(${dto.ativo ?? null}, ativo),
        atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    if (!cond) throw new NotFoundException();
    return cond;
  }

  async vincularSupervisor(condominioId: string, supervisorId: string) {
    await this.sql`
      INSERT INTO supervisor_condominios (condominio_id, supervisor_id)
      VALUES (${condominioId}, ${supervisorId})
      ON CONFLICT DO NOTHING
    `;
    return { ok: true };
  }

  async desvincularSupervisor(condominioId: string, supervisorId: string) {
    await this.sql`
      DELETE FROM supervisor_condominios
      WHERE condominio_id = ${condominioId} AND supervisor_id = ${supervisorId}
    `;
    return { ok: true };
  }
}
