CREATE TABLE IF NOT EXISTS pontos_ronda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  imagem TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registros_ronda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ponto_id UUID NOT NULL REFERENCES pontos_ronda(id) ON DELETE CASCADE,
  funcionario_id UUID REFERENCES usuarios(id),
  funcionario_nome VARCHAR(255),
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  endereco TEXT,
  observacao TEXT,
  foto_selfie TEXT
);

CREATE INDEX IF NOT EXISTS idx_registros_ronda_ponto ON registros_ronda(ponto_id);
CREATE INDEX IF NOT EXISTS idx_registros_ronda_func ON registros_ronda(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_registros_ronda_data ON registros_ronda(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_pontos_ronda_cond ON pontos_ronda(condominio_id);
