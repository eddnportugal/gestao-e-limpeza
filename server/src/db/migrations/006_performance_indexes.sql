-- ════════════════════════════════════════════
-- 006: Performance indexes for 50+ condominios scale
-- ════════════════════════════════════════════

-- ── Dashboard summary queries (heaviest endpoint) ──

-- reportes: dashboard filtra por condominio + status + data
CREATE INDEX IF NOT EXISTS idx_reportes_cond_status ON reportes(condominio_id, status);
CREATE INDEX IF NOT EXISTS idx_reportes_data_desc ON reportes(data DESC);
CREATE INDEX IF NOT EXISTS idx_reportes_cond_data ON reportes(condominio_id, data DESC);

-- tarefas_execucoes: dashboard JOIN + filtro por data
CREATE INDEX IF NOT EXISTS idx_exec_tarefa_data ON tarefas_execucoes(tarefa_id, data_execucao DESC);
CREATE INDEX IF NOT EXISTS idx_exec_data_status ON tarefas_execucoes(data_execucao, status);

-- controle_ponto: dashboard conta check-ins do dia
CREATE INDEX IF NOT EXISTS idx_ponto_data ON controle_ponto(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_ponto_tipo_data ON controle_ponto(tipo, data_hora DESC);

-- vencimentos: dashboard filtra por condominio + data
CREATE INDEX IF NOT EXISTS idx_venc_cond_data ON vencimentos(condominio_id, data_vencimento);

-- condominios: scope queries filtram por criado_por + ativo
CREATE INDEX IF NOT EXISTS idx_cond_criado_ativo ON condominios(criado_por) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_cond_status_plano ON condominios(status_plano, ativo);

-- ── Scope middleware (runs on EVERY request) ──

-- usuarios: supervisor scope usa supervisor_id + condominio_id
CREATE INDEX IF NOT EXISTS idx_usuarios_sup_cond ON usuarios(supervisor_id, condominio_id) WHERE condominio_id IS NOT NULL;

-- ── Auth middleware (user lookup on every request) ──
CREATE INDEX IF NOT EXISTS idx_usuarios_id_ativo ON usuarios(id) WHERE ativo = true AND bloqueado = false;

-- ── Frequently queried tables ──

-- moradores: listagem por condominio
CREATE INDEX IF NOT EXISTS idx_moradores_condominio ON moradores(condominio_id);

-- comunicados: listagem por condominio
CREATE INDEX IF NOT EXISTS idx_comunicados_condominio ON comunicados(condominio_id);

-- roteiros: listagem por condominio
CREATE INDEX IF NOT EXISTS idx_roteiros_condominio ON roteiros(condominio_id);

-- geolocalizacao: filtra por user + data
CREATE INDEX IF NOT EXISTS idx_geo_user_data ON geolocalizacao(user_id, data DESC);

-- documentos_publicos: público por slug
CREATE INDEX IF NOT EXISTS idx_docpub_slug ON documentos_publicos(slug) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_docpub_condominio ON documentos_publicos(condominio_id);

-- login_attempts: rate limiting
CREATE INDEX IF NOT EXISTS idx_login_email_data ON login_attempts(email, criado_em DESC);

-- audit_logs: listagem paginada
CREATE INDEX IF NOT EXISTS idx_audit_criado ON audit_logs(criado_em DESC);

-- metricas_uso: dashboard metrics
CREATE INDEX IF NOT EXISTS idx_metricas_data ON metricas_uso(data DESC);

-- notificacoes: unread count
CREATE INDEX IF NOT EXISTS idx_notif_user_lida ON notificacoes(user_id) WHERE lida = false;

-- ── ANALYZE para atualizar estatísticas do query planner ──
ANALYZE condominios;
ANALYZE usuarios;
ANALYZE reportes;
ANALYZE tarefas_agendadas;
ANALYZE tarefas_execucoes;
ANALYZE controle_ponto;
ANALYZE vencimentos;
