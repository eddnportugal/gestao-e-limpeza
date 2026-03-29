import pg from 'pg';

const { Client } = pg;

const target = (process.argv[2] || 'sb').trim().toLowerCase();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'gestao',
  user: process.env.DB_USER || 'gestao',
  password: process.env.DB_PASSWORD || 'gestao_secret',
  connectionTimeoutMillis: 5000
});

function resolveEmployee(rows, needle) {
  if (rows.length === 0) {
    throw new Error(`Nenhum usuario encontrado para "${needle}".`);
  }

  const exactNome = rows.find((row) => row.nome?.trim().toLowerCase() === needle);
  if (exactNome) {
    return exactNome;
  }

  const exactEmail = rows.find((row) => row.email?.trim().toLowerCase() === needle);
  if (exactEmail) {
    return exactEmail;
  }

  if (rows.length === 1) {
    return rows[0];
  }

  const summary = rows
    .map((row) => `${row.nome} <${row.email}> [${row.role}] condominio=${row.condominio_id}`)
    .join('\n');

  throw new Error(`Mais de um usuario encontrado para "${needle}":\n${summary}`);
}

async function main() {
  try {
    await client.connect();

    const employeeResult = await client.query(
      `
        SELECT id, nome, email, role, condominio_id, administrador_id, supervisor_id
        FROM usuarios
        WHERE lower(nome) LIKE $1 OR lower(email) LIKE $1
        ORDER BY nome
      `,
      [`%${target}%`]
    );

    const employee = resolveEmployee(employeeResult.rows, target);

    let admin = null;
    if (employee.administrador_id) {
      const adminById = await client.query(
        `SELECT id, nome, email, role, condominio_id FROM usuarios WHERE id = $1`,
        [employee.administrador_id]
      );
      admin = adminById.rows[0] || null;
    }

    if (!admin) {
      const adminResult = await client.query(
        `
          SELECT id, nome, email, role, condominio_id
          FROM usuarios
          WHERE condominio_id = $1
            AND role IN ('administrador', 'master')
          ORDER BY CASE WHEN role = 'administrador' THEN 0 ELSE 1 END, nome
          LIMIT 1
        `,
        [employee.condominio_id]
      );
      admin = adminResult.rows[0] || null;
    }

    if (!admin) {
      throw new Error(`Nenhum administrador encontrado para o condominio ${employee.condominio_id}.`);
    }

    if (!employee.condominio_id || !admin.condominio_id) {
      const condoFallbackResult = await client.query(
        `SELECT id, nome FROM condominios ORDER BY nome LIMIT 1`
      );
      const fallbackCondo = condoFallbackResult.rows[0];

      if (!fallbackCondo) {
        throw new Error('Nao existe condominio cadastrado para vincular o funcionario de teste.');
      }

      if (!employee.condominio_id) {
        await client.query(`UPDATE usuarios SET condominio_id = $1 WHERE id = $2`, [fallbackCondo.id, employee.id]);
        employee.condominio_id = fallbackCondo.id;
      }

      if (!admin.condominio_id) {
        await client.query(`UPDATE usuarios SET condominio_id = $1 WHERE id = $2`, [fallbackCondo.id, admin.id]);
        admin.condominio_id = fallbackCondo.id;
      }
    }

    if (!employee.condominio_id) {
      throw new Error(`Usuario ${employee.nome} continua sem condominio_id apos tentativa de vinculo.`);
    }

    const condoResult = await client.query(
      `SELECT id, nome FROM condominios WHERE id = $1`,
      [employee.condominio_id]
    );
    const condominio = condoResult.rows[0] || { id: employee.condominio_id, nome: 'Condominio sem nome' };

    const stamp = new Date();
    const tag = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(stamp.getDate()).padStart(2, '0')}${String(stamp.getHours()).padStart(2, '0')}${String(stamp.getMinutes()).padStart(2, '0')}`;

    const checklistItens = [
      { id: 'entrada-servico', label: 'Verificar entrada principal', concluido: false },
      { id: 'equipamentos', label: 'Conferir equipamentos de limpeza', concluido: false },
      { id: 'registro', label: 'Registrar observacoes iniciais', concluido: false }
    ];

    await client.query('BEGIN');

    const quadro = await client.query(
      `
        INSERT INTO quadro_atividades (
          titulo,
          descricao,
          status,
          prioridade,
          rotina,
          data_especifica,
          responsavel_id,
          responsavel_nome,
          condominio_id,
          criado_por,
          historico
        )
        VALUES ($1, $2, 'a_fazer', 'alta', 'diaria', CURRENT_DATE, $3, $4, $5, $6, '[]'::jsonb)
        RETURNING id, titulo
      `,
      [
        `Quadro teste ${tag}`,
        `Atividade simulada criada para validar exibicao do funcionario ${employee.nome}.`,
        employee.id,
        employee.nome,
        employee.condominio_id,
        admin.id
      ]
    );

    const tarefa = await client.query(
      `
        INSERT INTO tarefas_agendadas (
          titulo,
          descricao,
          funcionario_id,
          funcionario_nome,
          condominio_id,
          bloco,
          local,
          recorrencia,
          data_especifica,
          criado_por,
          prioridade
        )
        VALUES ($1, $2, $3, $4, $5, 'A', 'Hall principal', 'unica', CURRENT_DATE, $6, 'alta')
        RETURNING id, titulo
      `,
      [
        `Tarefa teste ${tag}`,
        `Tarefa simulada para conferir sincronizacao administrador -> funcionario em ${condominio.nome}.`,
        employee.id,
        employee.nome,
        employee.condominio_id,
        admin.id
      ]
    );

    const vistoria = await client.query(
      `
        INSERT INTO vistorias (
          titulo,
          condominio_id,
          tipo,
          data,
          responsavel_id,
          responsavel_nome,
          status,
          itens
        )
        VALUES ($1, $2, 'rotina', CURRENT_DATE, $3, $4, 'pendente', $5::jsonb)
        RETURNING id, titulo
      `,
      [
        `Vistoria teste ${tag}`,
        employee.condominio_id,
        employee.id,
        employee.nome,
        JSON.stringify([
          { id: 'portaria', nome: 'Portaria', status: 'pendente', observacao: '' },
          { id: 'limpeza', nome: 'Area de limpeza', status: 'pendente', observacao: '' }
        ])
      ]
    );

    const checklist = await client.query(
      `
        INSERT INTO checklists (
          condominio_id,
          local,
          tipo,
          itens,
          responsavel_id,
          supervisor_id,
          data,
          status,
          criado_por
        )
        VALUES ($1, 'Recepcao e area comum', 'diaria', $2::jsonb, $3, $4, CURRENT_DATE, 'pendente', $5)
        RETURNING id, local
      `,
      [
        employee.condominio_id,
        JSON.stringify(checklistItens),
        employee.id,
        employee.supervisor_id,
        admin.id
      ]
    );

    await client.query('COMMIT');

    console.log(
      JSON.stringify(
        {
          employee: {
            id: employee.id,
            nome: employee.nome,
            email: employee.email,
            role: employee.role,
            condominioId: employee.condominio_id
          },
          admin: {
            id: admin.id,
            nome: admin.nome,
            email: admin.email,
            role: admin.role
          },
          condominio,
          created: {
            quadro: quadro.rows[0],
            tarefa: tarefa.rows[0],
            vistoria: vistoria.rows[0],
            checklist: checklist.rows[0]
          }
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

try {
  await main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}