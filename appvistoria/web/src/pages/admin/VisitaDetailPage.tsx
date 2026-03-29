import { useParams } from 'react-router-dom'
import { useVisita, useRespostas, usePendencias, useMensagens, useAcaoVisita } from '../../api/hooks'
import { CheckCircle, XCircle, Minus, Clock, Download, Send, ThumbsUp, Pause, Play } from 'lucide-react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { api } from '../../api/client'

const RESULTADO_ICON: Record<string, any> = {
  ok: { icon: CheckCircle, color: 'text-green-500' },
  nao_ok: { icon: XCircle, color: 'text-red-500' },
  na: { icon: Minus, color: 'text-gray-400' },
}

const STATUS_BADGE: Record<string, string> = {
  nao_iniciada: 'bg-gray-100 text-gray-600',
  em_andamento: 'bg-blue-100 text-blue-700',
  pausada: 'bg-yellow-100 text-yellow-700',
  aguardando_aprovacao: 'bg-orange-100 text-orange-700',
  aprovada: 'bg-green-100 text-green-700',
  enviada_sindico: 'bg-purple-100 text-purple-700',
}

export default function VisitaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: visita, isLoading } = useVisita(id!)
  const { data: respostas = [] } = useRespostas(id!)
  const { data: pendencias = [] } = usePendencias(id!)
  const { data: mensagens = [] } = useMensagens(id!)

  const aprovar = useAcaoVisita('aprovar')
  const enviarSindico = useAcaoVisita('enviar-sindico')

  const handleDownloadPdf = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/pdf/visita/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vistoria-${id}.pdf`
      a.click()
    } catch {
      toast.error('Erro ao gerar PDF')
    }
  }

  if (isLoading) return <div className="text-center py-20 text-gray-400">Carregando...</div>
  if (!visita) return <div className="text-center py-20 text-gray-400">Visita não encontrada</div>

  // Agrupa respostas por categoria
  const porCategoria = respostas.reduce((acc: any, r: any) => {
    const cat = r.categoria_nome || 'Geral'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(r)
    return acc
  }, {})

  const totalOk = respostas.filter((r: any) => r.resultado === 'ok').length
  const totalNaoOk = respostas.filter((r: any) => r.resultado === 'nao_ok').length
  const totalNA = respostas.filter((r: any) => r.resultado === 'na').length
  const pct = respostas.length > 0 ? Math.round((totalOk / (respostas.length - totalNA || 1)) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{visita.condominio_nome}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[visita.status] || 'bg-gray-100'}`}>
                {visita.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">Supervisor: {visita.supervisor_nome} · {dayjs(visita.criado_em).format('DD/MM/YYYY HH:mm')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleDownloadPdf} className="btn-secondary text-xs">
              <Download size={14} /> PDF
            </button>
            {visita.status === 'aguardando_aprovacao' && (
              <button
                onClick={() => aprovar.mutateAsync({ id }).then(() => toast.success('Visita aprovada!'))}
                className="btn-success text-xs"
              >
                <ThumbsUp size={14} /> Aprovar
              </button>
            )}
            {visita.status === 'aprovada' && (
              <button
                onClick={() => enviarSindico.mutateAsync({ id }).then(() => toast.success('Enviado ao síndico!'))}
                className="btn-primary text-xs"
              >
                <Send size={14} /> Enviar ao síndico
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Conforme', value: totalOk, color: 'bg-green-50 text-green-700' },
            { label: 'Não conforme', value: totalNaoOk, color: 'bg-red-50 text-red-700' },
            { label: 'N/A', value: totalNA, color: 'bg-gray-50 text-gray-600' },
            { label: 'Conformidade', value: `${pct}%`, color: 'bg-blue-50 text-blue-700' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-gray-900">Checklist</h2>
          {Object.entries(porCategoria).map(([cat, itens]: any) => (
            <div key={cat} className="card overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 font-semibold text-sm text-gray-700">
                {cat}
              </div>
              {itens.map((r: any) => {
                const cfg = RESULTADO_ICON[r.resultado] || { icon: Minus, color: 'text-gray-300' }
                const Icon = cfg.icon
                return (
                  <div key={r.id} className="px-4 py-3 border-b border-gray-50 last:border-0 flex items-start gap-3">
                    <Icon size={18} className={`flex-shrink-0 mt-0.5 ${cfg.color}`} />
                    <div>
                      <div className="text-sm font-medium text-gray-800">{r.pergunta_texto}</div>
                      {r.transcricao_corrigida && (
                        <div className="text-xs text-gray-500 mt-1 italic">"{r.transcricao_corrigida}"</div>
                      )}
                      {r.observacao && !r.transcricao_corrigida && (
                        <div className="text-xs text-gray-500 mt-1">{r.observacao}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Sidebar: pendências + mensagens */}
        <div className="space-y-4">
          {/* Pendências */}
          <div className="card p-4">
            <h3 className="font-bold text-gray-900 mb-3">Pendências ({pendencias.length})</h3>
            <div className="space-y-2">
              {pendencias.map((p: any) => (
                <div key={p.id} className={`p-3 rounded-lg border-l-4 ${
                  p.prioridade === 'urgente' ? 'border-red-500 bg-red-50' :
                  p.prioridade === 'alta' ? 'border-orange-500 bg-orange-50' :
                  p.prioridade === 'media' ? 'border-yellow-500 bg-yellow-50' :
                  'border-gray-300 bg-gray-50'
                }`}>
                  <div className="text-xs font-bold uppercase text-gray-500">{p.prioridade}</div>
                  <div className="text-sm font-semibold text-gray-800 mt-0.5">{p.titulo}</div>
                  {p.descricao && <div className="text-xs text-gray-500 mt-1">{p.descricao}</div>}
                </div>
              ))}
              {pendencias.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma pendência</p>
              )}
            </div>
          </div>

          {/* Mensagens */}
          <div className="card p-4">
            <h3 className="font-bold text-gray-900 mb-3">Mensagens</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {mensagens.map((m: any) => (
                <div key={m.id} className="text-sm">
                  <span className="font-semibold text-brand-navy">{m.autor_nome}: </span>
                  <span className="text-gray-700">{m.texto}</span>
                  <div className="text-xs text-gray-400">{dayjs(m.criado_em).format('HH:mm')}</div>
                </div>
              ))}
              {mensagens.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma mensagem</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
