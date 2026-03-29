import { Injectable, Inject } from '@nestjs/common';
import { SQL } from '../database/database.module';
import { AppGateway } from '../gateway/app.gateway';

@Injectable()
export class MensagensService {
  constructor(
    @Inject(SQL) private readonly sql: any,
    private readonly gateway: AppGateway,
  ) {}

  async listarPorVisita(visitaId: string) {
    return this.sql`
      SELECT m.*, u.nome as autor_nome, u.role as autor_role, u.avatar_url as autor_avatar
      FROM mensagens m
      JOIN usuarios u ON u.id = m.autor_id
      WHERE m.visita_id = ${visitaId}
      ORDER BY m.criado_em ASC
    `;
  }

  async enviar(dto: any, autorId: string) {
    const [mensagem] = await this.sql`
      INSERT INTO mensagens (visita_id, autor_id, texto)
      VALUES (${dto.visita_id}, ${autorId}, ${dto.texto})
      RETURNING *
    `;

    const [com_autor] = await this.sql`
      SELECT m.*, u.nome as autor_nome, u.role as autor_role, u.avatar_url as autor_avatar
      FROM mensagens m JOIN usuarios u ON u.id = m.autor_id
      WHERE m.id = ${mensagem.id}
    `;

    // Emite para todos na sala da visita
    this.gateway.emitParaVisita(dto.visita_id, 'mensagem:nova', com_autor);

    // Busca empresa para emitir na timeline
    const [visita] = await this.sql`SELECT empresa_id FROM visitas WHERE id = ${dto.visita_id}`;
    if (visita) {
      this.gateway.emitParaEmpresa(visita.empresa_id, 'mensagem:nova', com_autor);
    }

    return com_autor;
  }
}
