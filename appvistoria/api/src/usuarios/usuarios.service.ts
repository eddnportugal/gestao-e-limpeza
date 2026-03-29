import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { SQL } from '../database/database.module';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(@Inject(SQL) private readonly sql: any) {}

  async listar(empresaId: string) {
    return this.sql`
      SELECT id, nome, email, role, telefone, avatar_url, ativo, ultimo_login, criado_em
      FROM usuarios
      WHERE empresa_id = ${empresaId}
      ORDER BY nome
    `;
  }

  async buscarPorId(id: string) {
    const [usuario] = await this.sql`
      SELECT id, nome, email, role, telefone, avatar_url, ativo, empresa_id, criado_em
      FROM usuarios WHERE id = ${id}
    `;
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    return usuario;
  }

  async criar(dto: any, empresaId: string) {
    const [existe] = await this.sql`SELECT id FROM usuarios WHERE email = ${dto.email} AND empresa_id = ${empresaId}`;
    if (existe) throw new ConflictException('Email já cadastrado');

    const senha_hash = await bcrypt.hash(dto.senha, 12);
    const [usuario] = await this.sql`
      INSERT INTO usuarios (empresa_id, nome, email, senha_hash, role, telefone)
      VALUES (${empresaId}, ${dto.nome}, ${dto.email}, ${senha_hash}, ${dto.role || 'supervisor'}, ${dto.telefone || null})
      RETURNING id, nome, email, role, telefone, ativo, criado_em
    `;
    return usuario;
  }

  async atualizar(id: string, dto: any) {
    let senhaUpdate = this.sql``;
    if (dto.senha) {
      const senha_hash = await bcrypt.hash(dto.senha, 12);
      senhaUpdate = this.sql`, senha_hash = ${senha_hash}`;
    }

    const [usuario] = await this.sql`
      UPDATE usuarios SET
        nome = COALESCE(${dto.nome || null}, nome),
        telefone = COALESCE(${dto.telefone || null}, telefone),
        ativo = COALESCE(${dto.ativo ?? null}, ativo),
        atualizado_em = NOW()
        ${senhaUpdate}
      WHERE id = ${id}
      RETURNING id, nome, email, role, telefone, ativo
    `;
    if (!usuario) throw new NotFoundException();
    return usuario;
  }

  async supervisoresDoCondominio(condominioId: string) {
    return this.sql`
      SELECT u.id, u.nome, u.email, u.telefone, u.avatar_url
      FROM usuarios u
      JOIN supervisor_condominios sc ON sc.supervisor_id = u.id
      WHERE sc.condominio_id = ${condominioId} AND u.ativo = true
    `;
  }
}
