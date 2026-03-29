-- ════════════════════════════════════════════
-- 003: Tabela reset_tokens + índices de performance
-- ════════════════════════════════════════════

-- Tabela para tokens de reset de senha
CREATE TABLE IF NOT EXISTS reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON reset_tokens(token) WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON reset_tokens(user_id);

-- Índices de performance para queries frequentes
CREATE INDEX IF NOT EXISTS idx_usuarios_admin_id ON usuarios(administrador_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_supervisor_id ON usuarios(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo_role ON usuarios(ativo, role);
CREATE INDEX IF NOT EXISTS idx_os_data_abertura ON ordens_servico(data_abertura DESC);
CREATE INDEX IF NOT EXISTS idx_os_condominio_status ON ordens_servico(condominio_id, status);
CREATE INDEX IF NOT EXISTS idx_tarefas_exec_data ON tarefas_execucoes(data_execucao DESC);
CREATE INDEX IF NOT EXISTS idx_checklists_condominio ON checklists(condominio_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_metricas_condominio ON metricas_uso(condominio_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user ON notificacoes(user_id, lida);
