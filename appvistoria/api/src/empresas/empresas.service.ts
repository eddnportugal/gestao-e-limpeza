import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SQL } from '../database/database.module';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmpresasService {
  constructor(@Inject(SQL) private readonly sql: any) {}

  async listar() {
    return this.sql`SELECT * FROM empresas ORDER BY nome`;
  }

  async buscarPorId(id: string) {
    const [empresa] = await this.sql`SELECT * FROM empresas WHERE id = ${id}`;
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    return empresa;
  }

  async criar(dto: any) {
    const [empresa] = await this.sql`
      INSERT INTO empresas (nome, cnpj, email, telefone, plano)
      VALUES (${dto.nome}, ${dto.cnpj || null}, ${dto.email}, ${dto.telefone || null}, ${dto.plano || 'basico'})
      RETURNING *
    `;
    return empresa;
  }

  async atualizar(id: string, dto: any) {
    const [empresa] = await this.sql`
      UPDATE empresas SET
        nome = COALESCE(${dto.nome || null}, nome),
        email = COALESCE(${dto.email || null}, email),
        telefone = COALESCE(${dto.telefone || null}, telefone),
        plano = COALESCE(${dto.plano || null}, plano),
        ativo = COALESCE(${dto.ativo ?? null}, ativo),
        atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    if (!empresa) throw new NotFoundException();
    return empresa;
  }
}
