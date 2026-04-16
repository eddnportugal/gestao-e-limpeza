import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { auth as apiAuth, setToken, getToken } from '../services/api';
import type { User, UserRole } from '../types';

interface AuthContextData {
  usuario: User | null;
  carregando: boolean;
  erro: string | null;
  login: (email: string, senha: string) => Promise<void>;
  cadastrar: (email: string, senha: string, nome: string, role: UserRole, extras?: { administradorId?: string; supervisorId?: string; condominioId?: string }) => Promise<void>;
  logout: () => Promise<void>;
  atualizarUsuario: (dados: Partial<User>) => Promise<void>;
  limparErro: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

/** Checar se backend está disponível via VITE_API_URL */
const useApiMode = () => {
  try {
    return !!import.meta.env.VITE_API_URL;
  } catch {
    return false;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const apiMode = useApiMode();

  const limparErro = useCallback(() => setErro(null), []);

  // Converter resposta da API para formato User do frontend
  const apiToUser = (data: any): User => ({
    id: data.id,
    email: data.email,
    nome: data.nome,
    role: data.role,
    ativo: data.ativo ?? true,
    bloqueado: data.bloqueado ?? false,
    motivoBloqueio: data.motivoBloqueio || data.motivo_bloqueio,
    criadoPor: data.criadoPor || data.criado_por || '',
    administradorId: data.administradorId || data.administrador_id,
    supervisorId: data.supervisorId || data.supervisor_id,
    condominioId: data.condominioId || data.condominio_id,
    avatarUrl: data.avatarUrl || data.avatar_url,
    telefone: data.telefone,
    cargo: data.cargo,
    criadoEm: data.criadoEm || data.criado_em || Date.now(),
    atualizadoEm: data.atualizadoEm || data.atualizado_em || Date.now(),
  });

  // Escutar evento de token inválido disparado pela camada de API
  useEffect(() => {
    const handler = () => {
      setUsuario(null);
      setCarregando(false);
    };
    globalThis.addEventListener('auth:token-invalid', handler);
    return () => globalThis.removeEventListener('auth:token-invalid', handler);
  }, []);

  useEffect(() => {
    if (apiMode) {
      const token = getToken();
      if (token) {
        const handleMeSuccess = (data: any) => setUsuario(apiToUser(data));
        const handleRetry = () => {
          apiAuth.me().then(handleMeSuccess).catch(() => setToken(null));
        };
        apiAuth.me()
          .then(handleMeSuccess)
          .catch((err) => {
            const msg = err?.message || '';
            if (msg.includes('Token inválido') || msg.includes('Token não fornecido') || msg.includes('Usuário não encontrado')) {
              setToken(null);
            } else {
              console.warn('[Auth] Erro temporário ao verificar sessão:', msg);
              const retryTimer = setTimeout(handleRetry, 5000);
              return () => clearTimeout(retryTimer);
            }
          })
          .finally(() => setCarregando(false));
      } else {
        setCarregando(false);
      }
      return;
    }

    setErro('API de autenticação não configurada. Defina VITE_API_URL para usar o sistema principal.');
    setCarregando(false);
  }, [apiMode]);

  const parseLoginError = (e: any): string => {
    if (e?.message) return e.message;
    return e.message || 'Erro ao fazer login.';
  };

  const login = async (email: string, senha: string) => {
    setErro(null);
    setCarregando(true);
    try {
      if (!apiMode) {
        throw new Error('API de autenticação não configurada.');
      }
      const { token, user } = await apiAuth.login(email, senha);
      setToken(token);
      setUsuario(apiToUser(user));
    } catch (e: any) {
      const msg = parseLoginError(e);
      setErro(msg);
      throw new Error(msg);
    } finally {
      setCarregando(false);
    }
  };

  const parseCadastroError = (e: any): string => {
    if (e?.message) return e.message;
    return e.message || 'Erro ao cadastrar.';
  };

  const cadastrar = async (email: string, senha: string, nome: string, role: UserRole, extras?: { administradorId?: string; supervisorId?: string; condominioId?: string }) => {
    setErro(null);
    setCarregando(true);
    try {
      if (!apiMode) {
        throw new Error('API de autenticação não configurada.');
      }
      await apiAuth.register({ email, senha, nome, role, condominioId: extras?.condominioId, supervisorId: extras?.supervisorId });
    } catch (e: any) {
      const msg = parseCadastroError(e);
      setErro(msg);
      throw new Error(msg);
    } finally {
      setCarregando(false);
    }
  };

  const logout = async () => {
    setUsuario(null);
    setToken(null);
    localStorage.removeItem('gestao_user');
  };

  const atualizarUsuario = async (dados: Partial<User>) => {
    if (!usuario) return;
    const updated = { ...usuario, ...dados, atualizadoEm: Date.now() };
    setUsuario(updated);
  };

  const contextValue = useMemo(() => (
    { usuario, carregando, erro, login, cadastrar, logout, atualizarUsuario, limparErro }
  ), [usuario, carregando, erro, login, cadastrar, logout, atualizarUsuario, limparErro]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx.login) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
