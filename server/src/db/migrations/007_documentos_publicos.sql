-- Create documentos_publicos table if it doesn't exist
CREATE TABLE IF NOT EXISTS documentos_publicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  slug UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  titulo VARCHAR(200) NOT NULL DEFAULT 'Documento Público',
  tipo VARCHAR(50) NOT NULL DEFAULT 'comunicado',
  conteudo TEXT,
  arquivo_url TEXT,
  arquivo_nome VARCHAR(255),
  ativo BOOLEAN NOT NULL DEFAULT true,
  visualizacoes INTEGER NOT NULL DEFAULT 0,
  criado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documentos_publicos_condominio ON documentos_publicos(condominio_id);
CREATE INDEX IF NOT EXISTS idx_documentos_publicos_slug ON documentos_publicos(slug)
