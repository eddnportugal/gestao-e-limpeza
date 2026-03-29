import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

// Auth
export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => api.get('/auth/me') })

// Visitas
export const useVisitas = (filtros?: any) =>
  useQuery({
    queryKey: ['visitas', filtros],
    queryFn: () => api.get('/visitas', { params: filtros }),
  })

export const useVisita = (id: string) =>
  useQuery({ queryKey: ['visita', id], queryFn: () => api.get(`/visitas/${id}`), enabled: !!id })

export const useTimeline = () =>
  useQuery({ queryKey: ['timeline'], queryFn: () => api.get('/visitas/timeline'), refetchInterval: 30_000 })

export const useCriarVisita = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: any) => api.post('/visitas', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visitas'] }),
  })
}

export const useAcaoVisita = (acao: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: any) => api.patch(`/visitas/${id}/${acao}`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['visita', vars.id] })
      qc.invalidateQueries({ queryKey: ['visitas'] })
      qc.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

// Condominios
export const useCondominios = () =>
  useQuery({ queryKey: ['condominios'], queryFn: () => api.get('/condominios') })

export const useCondominio = (id: string) =>
  useQuery({ queryKey: ['condominio', id], queryFn: () => api.get(`/condominios/${id}`), enabled: !!id })

// Usuarios
export const useUsuarios = () =>
  useQuery({ queryKey: ['usuarios'], queryFn: () => api.get('/usuarios') })

// Checklist
export const useCategorias = () =>
  useQuery({ queryKey: ['categorias'], queryFn: () => api.get('/checklist/categorias') })

export const useTemplates = () =>
  useQuery({ queryKey: ['templates'], queryFn: () => api.get('/checklist/templates') })

export const useRespostas = (visitaId: string) =>
  useQuery({
    queryKey: ['respostas', visitaId],
    queryFn: () => api.get(`/checklist/visitas/${visitaId}/respostas`),
    enabled: !!visitaId,
  })

export const usePendencias = (visitaId: string) =>
  useQuery({
    queryKey: ['pendencias', visitaId],
    queryFn: () => api.get(`/pendencias/visita/${visitaId}`),
    enabled: !!visitaId,
  })

export const useMensagens = (visitaId: string) =>
  useQuery({
    queryKey: ['mensagens', visitaId],
    queryFn: () => api.get(`/mensagens/visita/${visitaId}`),
    enabled: !!visitaId,
    refetchInterval: 5_000,
  })
