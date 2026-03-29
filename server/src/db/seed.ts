import bcrypt from 'bcrypt';
import pool from './database.js';

async function seed() {
  const client = await pool.connect();
  try {
    // Verificar se master já existe
    const { rows } = await client.query("SELECT id FROM usuarios WHERE role = 'master' LIMIT 1");
    if (rows.length > 0) {
      console.log('Usuário master já existe. Seed ignorado.');
      return;
    }

    const senhaHash = await bcrypt.hash('master123', 12);
    await client.query(
      `INSERT INTO usuarios (email, senha_hash, nome, role, criado_por)
       VALUES ($1, $2, $3, 'master', NULL)`,
      ['master@gestao.com', senhaHash, 'Master Admin']
    );
    console.log('Usuário master criado: master@gestao.com / master123');
    console.log('⚠️  TROQUE A SENHA APÓS O PRIMEIRO LOGIN!');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
