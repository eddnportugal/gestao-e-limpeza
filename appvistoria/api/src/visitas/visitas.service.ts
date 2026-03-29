import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { SQL } from '../database/database.module';
import { AppGateway } from '../gateway/app.gateway';

@Injectable()
export class VisitasService {
  constructor(
    @Inject(SQL) private readonly sql: any,
    private readonly gateway: AppGateway,
  ) {}

  async listar(empresaId: string, filtros: any = {}) {
    const { status, supervisorId, condominioId, dataInicio, dataFim } = filtros;

    return this.sql`
      SELECT v.*,
             c.nome as condominio_nome, c.endereco as condominio_endereco,
             u.nome as supervisor_nome,
             COUNT(DISTINCT r.id) as total_respostas,
             COUNT(DISTINCT p.id) as total_pendencias,
             COUNT(DISTINCT f.id) as total_fotos
      FROM visitas v
      JOIN condominios c ON c.id = v.condominio_id
      JOIN usuarios u ON u.id = v.supervisor_id
      LEFT JOIN respostas r ON r.visita_id = v.id
      LEFT JOIN pendencias p ON p.visita_id = v.id
      LEFT JOIN fotos f ON f.visita_id = v.id
      WHERE v.empresa_id = ${empresaId}
        ${status ? this.sql`AND v.status = ${status}` : this.sql``}
        ${supervisorId ? this.sql`AND v.supervisor_id = ${supervisorId}` : this.sql``}
        ${condominioId ? this.sql`AND v.condominio_id = ${condominioId}` : this.sql``}
        ${dataInicio ? this.sql`AND v.criado_em >= ${dataInicio}` : this.sql``}
        ${dataFim ? this.sql`AND v.criado_em <= ${dataFim}` : this.sql``}
      GROUP BY v.id, c.nome, c.endereco, u.nome
      ORDER BY v.criado_em DESC
    `;
  }

  async buscarPorId(id: string, empresaId?: string) {
    const [visita] = await this.sql`
      SELECT v.*,
             c.nome as condominio_nome, c.endereco as condominio_endereco,
             c.sindico_nome, c.sindico_email,
             u.nome as supervisor_nome, u.email as supervisor_email, u.telefone as supervisor_telefone
      FROM visitas v
      JOIN condominios c ON c.id = v.condominio_id
      JOIN usuarios u ON u.id = v.supervisor_id
      WHERE v.id = ${id}
        ${empresaId ? this.sql`AND v.empresa_id = ${empresaId}` : this.sql``}
    `;
    if (!visita) throw new NotFoundException('Visita não encontrada');
    return visita;
  }

  async criar(dto: any, supervisorId: string, empresaId: string) {
    const [visita] = await this.sql`
      INSERT INTO visitas (empresa_id, condominio_id, supervisor_id, template_id, titulo)
      VALUES (${empresaId}, ${dto.condominio_id}, ${supervisorId}, ${dto.template_id || null}, ${dto.titulo || null})
      RETURNING *
    `;

    this.gateway.emitParaEmpresa(empresaId, 'visita:criada', visita);
    return visita;
  }

  async iniciar(id: string, supervisorId: string, empresaId: string) {
    const visita = await this.buscarPorId(id);
    if (visita.status !== 'nao_iniciada' && visita.status !== 'pausada') {
      throw new BadRequestException('Visita não pode ser iniciada nesse status');
    }

    const [updated] = await this.sql`
      UPDATE visitas
      SET status = 'em_andamento', iniciada_em = COALESCE(iniciada_em, NOW()), atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    this.gateway.emitParaEmpresa(empresaId, 'visita:iniciada', { id, supervisor_id: supervisorId });
    return updated;
  }

  async pausar(id: string, supervisorId: string, empresaId: string) {
    const [updated] = await this.sql`
      UPDATE visitas
      SET status = 'pausada', pausada_em = NOW(), atualizado_em = NOW()
      WHERE id = ${id} AND status = 'em_andamento'
      RETURNING *
    `;
    if (!updated) throw new BadRequestException('Visita não está em andamento');

    this.gateway.emitParaEmpresa(empresaId, 'visita:pausada', { id });
    return updated;
  }

  async finalizar(id: string, supervisorId: string, empresaId: string, observacoes?: string) {
    const visita = await this.buscarPorId(id);

    // Calcula tempo total
    const iniciada = new Date(visita.iniciada_em).getTime();
    const agora = Date.now();
    const tempoTotal = Math.floor((agora - iniciada) / 1000);

    const [updated] = await this.sql`
      UPDATE visitas
      SET status = 'aguardando_aprovacao',
          finalizada_em = NOW(),
          observacoes_gerais = COALESCE(${observacoes || null}, observacoes_gerais),
          tempo_total_segundos = ${tempoTotal},
          atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    this.gateway.emitParaEmpresa(empresaId, 'visita:finalizada', { id, supervisor_id: supervisorId });
    return updated;
  }

  async aprovar(id: string, adminId: string, empresaId: string) {
    const [updated] = await this.sql`
      UPDATE visitas
      SET status = 'aprovada', aprovada_em = NOW(), aprovada_por = ${adminId}, atualizado_em = NOW()
      WHERE id = ${id} AND status = 'aguardando_aprovacao'
      RETURNING *
    `;
    if (!updated) throw new BadRequestException('Visita não está aguardando aprovação');

    this.gateway.emitParaEmpresa(empresaId, 'visita:aprovada', { id });
    return updated;
  }

  async enviarSindico(id: string, adminId: string, empresaId: string) {
    const { v4: uuidv4 } = require('uuid');
    const token = uuidv4();

    const [updated] = await this.sql`
      UPDATE visitas
      SET status = 'enviada_sindico', enviada_sindico_em = NOW(), atualizado_em = NOW()
      WHERE id = ${id} AND status = 'aprovada'
      RETURNING *
    `;
    if (!updated) throw new BadRequestException('Visita precisa estar aprovada');

    await this.sql`
      INSERT INTO confirmacoes_sindico (visita_id, condominio_id, token)
      VALUES (${id}, ${updated.condominio_id}, ${token})
    `;

    return { ...updated, token_sindico: token };
  }

  async listarTimeline(empresaId: string, limite = 50) {
    return this.sql`
      SELECT
        'visita' as tipo,
        v.id,
        v.status,
        v.atualizado_em as momento,
        c.nome as condominio_nome,
        u.nome as supervisor_nome,
        NULL as texto
      FROM visitas v
      JOIN condominios c ON c.id = v.condominio_id
      JOIN usuarios u ON u.id = v.supervisor_id
      WHERE v.empresa_id = ${empresaId}
        AND v.atualizado_em > NOW() - INTERVAL '24 hours'

      UNION ALL

      SELECT
        'mensagem' as tipo,
        m.id,
        NULL as status,
        m.criado_em as momento,
        c.nome as condominio_nome,
        u.nome as supervisor_nome,
        m.texto
      FROM mensagens m
      JOIN visitas v ON v.id = m.visita_id
      JOIN condominios c ON c.id = v.condominio_id
      JOIN usuarios u ON u.id = m.autor_id
      WHERE v.empresa_id = ${empresaId}
        AND m.criado_em > NOW() - INTERVAL '24 hours'

      ORDER BY momento DESC
      LIMIT ${limite}
    `;
  }
}
