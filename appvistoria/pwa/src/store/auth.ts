import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../api/client'

interface User {
  id: string; nome: string; email: string
  role: string; empresa_id: string
}

interface AuthState {
  user: User | null; token: string | null
  login: (email: string, senha: string) => Promise<void>
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null, token: null,
      login: async (email, senha) => {
        const res: any = await api.post('/auth/login', { email, senha })
        localStorage.setItem('token', res.access_token)
        set({ user: res.usuario, token: res.access_token })
      },
      logout: () => {
        localStorage.removeItem('token')
        set({ user: null, token: null })
      },
    }),
    { name: 'appvistoria-pwa-auth', partialize: (s) => ({ user: s.user, token: s.token }) },
  ),
)
