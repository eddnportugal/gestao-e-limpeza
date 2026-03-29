import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useVisitas, useCriarVisita, useCondominios, useTemplates } from '../../api/hooks'
import { Plus, Search, Filter, Eye } from 'lucide-react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'

const STATUS_LABEL: Record<string, string> = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  pausada: 'Pausada',
  aguardando_aprovacao: 'Aguard. aprovação',
  aprovada: 'Aprovada',
  enviada_sindico: 'Enviada ao síndico',
  concluida: 'Concluída',
}

const STATUS_BADGE: Record<string, string> = {
  nao_iniciada: 'bg-gray-100 text-gray-600',
  em_andamento: 'bg-blue-100 text-blue-700',
  pausada: 'bg-yellow-100 text-yellow-700',
  aguardando_aprovacao: 'bg-orange-100 text-orange-700',
  aprovada: 'bg-green-100 text-green-700',
  enviada_sindico: 'bg-purple-100 text-purple-700',
  concluida: 'bg-gray-800 text-white',
}

export default function VisitasPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ condominio_id: '', template_id: '', titulo: '' })

  const { data: visitas = [], isLoading } = useVisitas()
  const { data: condominios = [] } = useCondominios()
  const { data: templates = [] } = useTemplates()
  const criar = useCriarVisita()

  const filtered = visitas.filter((v: any) =>
    v.condominio_nome?.toLowerCase().includes(search.toLowerCase()) ||
    v.supervisor_nome?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await criar.mutateAsync(form)
      toast.success('Visita criada!')
      setShowModal(false)
      setForm({ condominio_id: '', template_id: '', titulo: '' })
    } catch {
      toast.error('Erro ao criar visita')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visitas</h1>
          <p className="text-sm text-gray-500">{visitas.length} visitas registradas</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Nova visita
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por condomínio ou supervisor..."
          className="input pl-9"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Condomínio</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Supervisor</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Data</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Pendências</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((v: any) => (
              <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{v.condominio_nome}</td>
                <td className="px-4 py-3 text-gray-600">{v.supervisor_nome}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[v.status] || 'bg-gray-100'}`}>
                    {STATUS_LABEL[v.status] || v.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{dayjs(v.criado_em).format('DD/MM/YYYY')}</td>
                <td className="px-4 py-3 text-center">
                  {v.total_pendencias > 0 ? (
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {v.total_pendencias}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/visitas/${v.id}`} className="text-brand-navy hover:underline flex items-center gap-1">
                    <Eye size={14} /> Ver
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  Nenhuma visita encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Nova Visita</h2>
            <form onSubmit={handleCriar} className="space-y-4">
              <div>
                <label className="label">Condomínio *</label>
                <select
                  value={form.condominio_id}
                  onChange={(e) => setForm({ ...form, condominio_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Selecione...</option>
                  {condominios.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Template de checklist</label>
                <select
                  value={form.template_id}
                  onChange={(e) => setForm({ ...form, template_id: e.target.value })}
                  className="input"
                >
                  <option value="">Sem template</option>
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Título (opcional)</label>
                <input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="input"
                  placeholder="Ex: Vistoria mensal - Março"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={criar.isPending} className="btn-primary flex-1 justify-center">
                  {criar.isPending ? 'Criando...' : 'Criar visita'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
