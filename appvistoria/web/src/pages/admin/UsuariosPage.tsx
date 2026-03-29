import { useState } from 'react'
import { useUsuarios } from '../../api/hooks'
import { api } from '../../api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, User, Mail, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

const ROLE_LABEL: Record<string, string> = {
  master: 'Master', admin: 'Administrador', supervisor: 'Supervisor', sindico: 'Síndico'
}
const ROLE_BADGE: Record<string, string> = {
  master: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  supervisor: 'bg-green-100 text-green-700',
  sindico: 'bg-orange-100 text-orange-700',
}

export default function UsuariosPage() {
  const { data: usuarios = [] } = useUsuarios()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'supervisor', telefone: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/usuarios', form)
      toast.success('Usuário criado!')
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      setShowModal(false)
      setForm({ nome: '', email: '', senha: '', role: 'supervisor', telefone: '' })
    } catch (err: any) {
      toast.error(err?.message || err?.error || 'Erro ao criar usuário')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500">{usuarios.length} usuários</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Novo usuário
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Perfil</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Último acesso</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuarios.map((u: any) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand-light rounded-full flex items-center justify-center text-brand-navy font-bold text-sm">
                      {u.nome?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{u.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[u.role] || 'bg-gray-100'}`}>
                    {ROLE_LABEL[u.role] || u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {u.ultimo_login ? dayjs(u.ultimo_login).format('DD/MM/YYYY HH:mm') : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Novo Usuário</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Nome completo *</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="label">Senha *</label>
                <input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} className="input" required minLength={6} />
              </div>
              <div>
                <label className="label">Perfil *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input">
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrador</option>
                  <option value="sindico">Síndico</option>
                </select>
              </div>
              <div>
                <label className="label">Telefone</label>
                <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="input" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? 'Criando...' : 'Criar usuário'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
