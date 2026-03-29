import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import { SQL } from '../database/database.module';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @Inject(SQL) private readonly sql: any,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, senha: string) {
    const [usuario] = await this.sql`
      SELECT u.*, e.nome as empresa_nome
      FROM usuarios u
      LEFT JOIN empresas e ON e.id = u.empresa_id
      WHERE u.email = ${email} AND u.ativo = true
    `;

    if (!usuario) throw new UnauthorizedException('Credenciais inválidas');

    const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaOk) throw new UnauthorizedException('Credenciais inválidas');

    await this.sql`
      UPDATE usuarios SET ultimo_login = NOW() WHERE id = ${usuario.id}
    `;

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
      empresa_id: usuario.empresa_id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        empresa_id: usuario.empresa_id,
        empresa_nome: usuario.empresa_nome,
        avatar_url: usuario.avatar_url,
      },
    };
  }

  async me(userId: string) {
    const [usuario] = await this.sql`
      SELECT u.id, u.nome, u.email, u.role, u.telefone, u.avatar_url,
             u.empresa_id, e.nome as empresa_nome, e.logo_url as empresa_logo
      FROM usuarios u
      LEFT JOIN empresas e ON e.id = u.empresa_id
      WHERE u.id = ${userId} AND u.ativo = true
    `;
    if (!usuario) throw new UnauthorizedException();
    return usuario;
  }
}
