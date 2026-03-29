-- Migration 004: identidade institucional para PDFs e login por condomínio
-- Executar no banco de produção antes do deploy

ALTER TABLE condominios ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE condominios ADD COLUMN IF NOT EXISTS login_titulo VARCHAR(255);
ALTER TABLE condominios ADD COLUMN IF NOT EXISTS login_subtitulo VARCHAR(255);
ALTER TABLE condominios ADD COLUMN IF NOT EXISTS relatorio_responsavel_nome VARCHAR(255);
ALTER TABLE condominios ADD COLUMN IF NOT EXISTS relatorio_responsavel_cargo VARCHAR(255);
ALTER TABLE condominios ADD COLUMN IF NOT EXISTS relatorio_responsavel_registro VARCHAR(100);
ALTER TABLE condominios ADD COLUMN IF NOT EXISTS relatorio_telefone VARCHAR(20);
ALTER TABLE condominios ADD COLUMN IF NOT EXISTS relatorio_email VARCHAR(255);
ALTER TABLE condominios ADD COLUMN IF NOT EXISTS relatorio_documento VARCHAR(100);
ALTER TABLE condominios ADD COLUMN IF NOT EXISTS relatorio_observacoes TEXT;

UPDATE condominios
SET relatorio_responsavel_nome = COALESCE(relatorio_responsavel_nome, sindico),
    relatorio_telefone = COALESCE(relatorio_telefone, telefone),
    relatorio_email = COALESCE(relatorio_email, email)
WHERE relatorio_responsavel_nome IS NULL
   OR relatorio_telefone IS NULL
   OR relatorio_email IS NULL;