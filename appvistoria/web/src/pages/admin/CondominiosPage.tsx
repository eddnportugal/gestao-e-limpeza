import { useState } from 'react'
import { useCondominios } from '../../api/hooks'
import { api } from '../../api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Building2, Users, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

const emptyForm = {
  nome: '', endereco: '', cidade: '', estado: '',
  sindico_nome: '', sindico_email: '', sindico_telefone: '', total_unidades: '',
}

export default function CondominiosPage() {
  const { data: condominios = [], isLoading } = useCondominios()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/condominios', {
        ...form,
        total_unidades: form.total_unidades ? Number(form.total_unidades) : null,
      })
      toast.success('Condomínio cadastrado!')
      qc.invalidateQueries({ queryKey: ['condominios'] })
      setShowModal(false)
      setForm(emptyForm)
    } catch {
      toast.error('Erro ao cadastrar condomínio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Condomínios</h1>
          <p className="text-sm text-gray-500">{condominios.length} cadastrados</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Novo condomínio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {condominios.map((c: any) => (
          <div key={c.id} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 size={20} className="text-brand-navy" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{c.nome}</h3>
                {c.total_unidades && (
                  <p className="text-xs text-gray-500">{c.total_unidades} unidades</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5 text-sm text-gray-500">
              {c.endereco && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} /> {c.endereco}
                  {c.cidade && `, ${c.cidade}/${c.estado}`}
                </div>
              )}
              {c.sindico_nome && (
                <div className="flex items-center gap-1.5">
                  <Users size={13} /> Síndico: {c.sindico_nome}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <span className="font-semibold text-blue-600">{c.total_supervisores || 0} supervisores</span>
              <span>·</span>
              <span>{c.visitas_ativas || 0} visitas ativas</span>
            </div>
          </div>
        ))}
        {condominios.length === 0 && !isLoading && (
          <div className="col-span-3 card p-12 text-center text-gray-400">
            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum condomínio cadastrado</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Novo Condomínio</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Nome *</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="label">Endereço *</label>
                <input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="input" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Cidade</label>
                  <input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Estado</label>
                  <input value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="input" maxLength={2} placeholder="SP" />
                </div>
              </div>
              <div>
                <label className="label">Nome do síndico</label>
                <input value={form.sindico_nome} onChange={(e) => setForm({ ...form, sindico_nome: e.target.value })} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Email do síndico</label>
                  <input type="email" value={form.sindico_email} onChange={(e) => setForm({ ...form, sindico_email: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Telefone do síndico</label>
                  <input value={form.sindico_telefone} onChange={(e) => setForm({ ...form, sindico_telefone: e.target.value })} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Total de unidades</label>
                <input type="number" value={form.total_unidades} onChange={(e) => setForm({ ...form, total_unidades: e.target.value })} className="input" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? 'Salvando...' : 'Cadastrar'}
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
