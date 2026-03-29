import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth as apiAuth, setToken, getToken } from '../services/api';
import type { User, UserRole } from '../types';

interface AuthContextData {
  usuario: User | null;
  firebaseUser: FirebaseUser | null;
  carregando: boolean;
  erro: string | null;
  login: (email: string, senha: string) => Promise<void>;
  cadastrar: (email: string, senha: string, nome: string, role: UserRole, extras?: { administradorId?: string; supervisorId?: string; condominioId?: string }) => Promise<void>;
  logout: () => Promise<void>;
  atualizarUsuario: (dados: Partial<User>) => Promise<void>;
  loginDireto: (user: User) => void;
  limparErro: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Mock data para desenvolvimento sem Firebase configurado
const MOCK_USERS: Record<string, User> = {
  'eduardodominikus@hotmail.com': {
    id: 'eduardo-001',
    email: 'eduardodominikus@hotmail.com',
    nome: 'Eduardo Dominikus',
    role: 'master',
    ativo: true,
    bloqueado: false,
    criadoPor: 'system',
    criadoEm: Date.now(),
    atualizadoEm: Date.now(),
  },
  'master@gestao.com': {
    id: 'master-001',
    email: 'master@gestao.com',
    nome: 'Master Admin',
    role: 'master',
    ativo: true,
    bloqueado: false,
    criadoPor: 'system',
    criadoEm: Date.now(),
    atualizadoEm: Date.now(),
  },
  'admin@gestao.com': {
    id: 'admin-001',
    email: 'admin@gestao.com',
    nome: 'Administrador',
    role: 'administrador',
    ativo: true,
    bloqueado: false,
    criadoPor: 'master-001',
    administradorId: 'master-001',
    condominioId: 'c1',
    criadoEm: Date.now(),
    atualizadoEm: Date.now(),
  },
  'supervisor@gestao.com': {
    id: 'sup-001',
    email: 'supervisor@gestao.com',
    nome: 'Supervisor Silva',
    role: 'supervisor',
    ativo: true,
    bloqueado: false,
    criadoPor: 'admin-001',
    administradorId: 'admin-001',
    supervisorId: 'admin-001',
    condominioId: 'c1',
    criadoEm: Date.now(),
    atualizadoEm: Date.now(),
  },
  'func@gestao.com': {
    id: 'func-001',
    email: 'func@gestao.com',
    nome: 'João Funcionário',
    role: 'funcionario',
    ativo: true,
    bloqueado: false,
    criadoPor: 'sup-001',
    administradorId: 'admin-001',
    supervisorId: 'sup-001',
    condominioId: 'c1',
    cargo: 'Auxiliar de Limpeza',
    criadoEm: Date.now(),
    atualizadoEm: Date.now(),
  },
  'aurora@cond.com': {
    id: 'aurora-001',
    email: 'aurora@cond.com',
    nome: 'Admin Aurora',
    role: 'administrador',
    ativo: true,
    bloqueado: false,
    criadoPor: 'master-001',
    administradorId: 'master-001',
    condominioId: 'c1',
    criadoEm: Date.now(),
    atualizadoEm: Date.now(),
  },
};

const useMockMode = () => {
  try {
    // Se VITE_API_URL está definido, usar API — senão mock
    if (import.meta.env.VITE_API_URL) return false;
    return !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'SUA_API_KEY';
  } catch {
    return true;
  }
};

/** Checar se backend está disponível via VITE_API_URL */
const useApiMode = () => {
  try {
    return !!import.meta.env.VITE_API_URL;
  } catch {
    return false;
  }
};

type FirebaseAuthModule = typeof import('firebase/auth');
type FirebaseFirestoreModule = typeof import('firebase/firestore');

interface FirebaseServices {
  auth: import('firebase/auth').Auth;
  db: import('firebase/firestore').Firestore;
  authModule: FirebaseAuthModule;
  firestoreModule: FirebaseFirestoreModule;
}

const loadFirebaseServices = async (): Promise<FirebaseServices> => {
  const [{ auth, db }, authModule, firestoreModule] = await Promise.all([
    import('../config/firebase'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);

  return { auth, db, authModule, firestoreModule };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const mockMode = useMockMode();
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

    // ── Modo Mock (dev local) ──
    if (mockMode) {
      const saved = localStorage.getItem('gestao_user');
      if (saved) {
        try { setUsuario(JSON.parse(saved)); } catch { /* ignore */ }
      }
      setCarregando(false);
      return;
    }

    let ativo = true;
    let unsubscribe: (() => void) | undefined;

    const iniciarFirebaseAuth = async () => {
      try {
        const { auth, db, authModule, firestoreModule } = await loadFirebaseServices();
        if (!ativo) return;

        unsubscribe = authModule.onAuthStateChanged(auth, async (fbUser) => {
          setFirebaseUser(fbUser);
          if (fbUser) {
            const userDoc = await firestoreModule.getDoc(firestoreModule.doc(db, 'usuarios', fbUser.uid));
            if (userDoc.exists()) {
              const userData = { id: fbUser.uid, ...userDoc.data() } as User;
              if (userData.bloqueado) {
                setErro(userData.motivoBloqueio || 'Conta bloqueada. Entre em contato com o suporte.');
                await authModule.signOut(auth);
                setUsuario(null);
              } else if (userData.ativo) {
                setUsuario(userData);
              } else {
                setErro('Conta desativada. Entre em contato com o administrador.');
                await authModule.signOut(auth);
                setUsuario(null);
              }
            }
          } else {
            setUsuario(null);
          }
          setCarregando(false);
        });
      } catch {
        if (!ativo) return;
        setErro('Erro ao inicializar autenticação.');
        setCarregando(false);
      }
    };

    iniciarFirebaseAuth();

    return () => {
      ativo = false;
      unsubscribe?.();
    };
  }, [apiMode, mockMode]);

  const handleMockLogin = (email: string, senha: string) => {
    const mockUser = MOCK_USERS[email.toLowerCase()];
    if (!mockUser || senha.length < 6) {
      throw new Error('E-mail ou senha inválidos.');
    }
    if (mockUser.bloqueado) {
      throw new Error(mockUser.motivoBloqueio || 'Conta bloqueada. Entre em contato com o suporte.');
    }
    setUsuario(mockUser);
    localStorage.setItem('gestao_user', JSON.stringify(mockUser));
    if (mockUser.condominioId) {
      localStorage.setItem('gestao-ultimo-condo', mockUser.condominioId);
    }
  };

  const parseLoginError = (e: any): string => {
    if (e.code === 'auth/invalid-credential') return 'E-mail ou senha inválidos.';
    if (e.code === 'auth/too-many-requests') return 'Muitas tentativas. Tente novamente mais tarde.';
    return e.message || 'Erro ao fazer login.';
  };

  const login = async (email: string, senha: string) => {
    setErro(null);
    setCarregando(true);
    try {
      if (apiMode) {
        const { token, user } = await apiAuth.login(email, senha);
        setToken(token);
        setUsuario(apiToUser(user));
      } else if (mockMode) {
        handleMockLogin(email, senha);
      } else {
        const { auth, authModule } = await loadFirebaseServices();
        await authModule.signInWithEmailAndPassword(auth, email, senha);
      }
    } catch (e: any) {
      const msg = parseLoginError(e);
      setErro(msg);
      throw new Error(msg);
    } finally {
      setCarregando(false);
    }
  };

  const resolveIds = (extras?: { administradorId?: string; supervisorId?: string; condominioId?: string }) => ({
    administradorId: extras?.administradorId || (usuario?.role === 'administrador' ? usuario.id : usuario?.administradorId),
    supervisorId: extras?.supervisorId || (usuario?.role === 'supervisor' ? usuario.id : undefined),
    condominioId: extras?.condominioId || usuario?.condominioId,
  });

  const parseCadastroError = (e: any): string => {
    if (e.code === 'auth/email-already-in-use') return 'Este e-mail já está cadastrado.';
    if (e.code === 'auth/weak-password') return 'A senha deve ter pelo menos 6 caracteres.';
    return e.message || 'Erro ao cadastrar.';
  };

  const cadastrar = async (email: string, senha: string, nome: string, role: UserRole, extras?: { administradorId?: string; supervisorId?: string; condominioId?: string }) => {
    setErro(null);
    setCarregando(true);
    try {
      if (apiMode) {
        await apiAuth.register({ email, senha, nome, role, condominioId: extras?.condominioId, supervisorId: extras?.supervisorId });
      } else if (mockMode) {
        const ids = resolveIds(extras);
        const newUser: User = {
          id: `user-${Date.now()}`, email, nome, role,
          ativo: true, bloqueado: false,
          criadoPor: usuario?.id || 'system',
          ...ids,
          criadoEm: Date.now(), atualizadoEm: Date.now(),
        };
        MOCK_USERS[email.toLowerCase()] = newUser;
      } else {
        const { auth, db, authModule, firestoreModule } = await loadFirebaseServices();
        const cred = await authModule.createUserWithEmailAndPassword(auth, email, senha);
        const ids = resolveIds(extras);
        await firestoreModule.setDoc(firestoreModule.doc(db, 'usuarios', cred.user.uid), {
          email, nome, role, ativo: true, bloqueado: false,
          criadoPor: usuario?.id || 'system',
          ...(ids.administradorId && { administradorId: ids.administradorId }),
          ...(ids.supervisorId && { supervisorId: ids.supervisorId }),
          ...(ids.condominioId && { condominioId: ids.condominioId }),
          criadoEm: firestoreModule.serverTimestamp(), atualizadoEm: firestoreModule.serverTimestamp(),
        });
      }
    } catch (e: any) {
      const msg = parseCadastroError(e);
      setErro(msg);
      throw new Error(msg);
    } finally {
      setCarregando(false);
    }
  };

  const loginDireto = (user: User) => {
    setUsuario(user);
    localStorage.setItem('gestao_user', JSON.stringify(user));
    setCarregando(false);
  };

  const logout = async () => {
    if (apiMode) {
      setUsuario(null);
      setToken(null);
    } else if (mockMode) {
      setUsuario(null);
      localStorage.removeItem('gestao_user');
    } else {
      const { auth, authModule } = await loadFirebaseServices();
      await authModule.signOut(auth);
    }
  };

  const atualizarUsuario = async (dados: Partial<User>) => {
    if (!usuario) return;
    if (apiMode) {
      const updated = { ...usuario, ...dados, atualizadoEm: Date.now() };
      setUsuario(updated);
    } else if (mockMode) {
      const updated = { ...usuario, ...dados, atualizadoEm: Date.now() };
      setUsuario(updated);
      localStorage.setItem('gestao_user', JSON.stringify(updated));
    } else {
      const { db, firestoreModule } = await loadFirebaseServices();
      await firestoreModule.updateDoc(
        firestoreModule.doc(db, 'usuarios', usuario.id),
        { ...dados, atualizadoEm: firestoreModule.serverTimestamp() }
      );
      setUsuario(prev => prev ? { ...prev, ...dados } : null);
    }
  };

  const contextValue = useMemo(() => (
    { usuario, firebaseUser, carregando, erro, login, cadastrar, logout, atualizarUsuario, loginDireto, limparErro }
  ), [usuario, firebaseUser, carregando, erro, login, cadastrar, logout, atualizarUsuario, loginDireto, limparErro]);

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
