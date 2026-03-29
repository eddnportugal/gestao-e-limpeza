import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Play, Pause, CheckSquare, MessageSquare,
  AlertTriangle, Send, Clock
} from 'lucide-react'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import MensagemModal from '../components/MensagemModal'

dayjs.extend(duration)

export default function VisitaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [visita, setVisita] = useState<any>(null)
  const [respostas, setRespostas] = useState<any[]>([])
  const [pendencias, setPendencias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [acao, setAcao] = useState('')
  const [showMsg, setShowMsg] = useState(false)
  const [tempo, setTempo] = useState(0)
  const [obs, setObs] = useState('')
  const [showFinalizar, setShowFinalizar] = useState(false)

  const carregar = async () => {
    const [v, r, p]: any = await Promise.all([
      api.get(`/visitas/${id}`),
      api.get(`/checklist/visitas/${id}/respostas`),
      api.get(`/pendencias/visita/${id}`),
    ])
    setVisita(v); setRespostas(r); setPendencias(p)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [id])

  useEffect(() => {
    if (visita?.status !== 'em_andamento') return
    const inicio = new Date(visita.iniciada_em).getTime()
    const interval = setInterval(() => {
      setTempo(Math.floor((Date.now() - inicio) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [visita?.status, visita?.iniciada_em])

  const executarAcao = async (acaoNome: string, body?: any) => {
    setAcao(acaoNome)
    try {
      await api.patch(`/visitas/${id}/${acaoNome}`, body || {})
      await carregar()
      toast.success({
        iniciar: 'Vistoria iniciada!',
        pausar: 'Vistoria pausada',
        finalizar: 'Enviada para aprovação!',
      }[acaoNome] || 'Ok!')
    } catch (err: any) {
      toast.error(err?.message || 'Erro na operação')
    } finally {
      setAcao('')
    }
  }

  const formatTempo = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h > 0 ? h + 'h ' : ''}${m}m ${sec}s`
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
      Carregando...
    </div>
  )
  if (!visita) return null

  const totalOk = respostas.filter((r: any) => r.resultado === 'ok').length
  const totalPerguntas = respostas.length
  const progresso = totalPerguntas > 0 ? Math.round((respostas.filter((r: any) => r.resultado).length / totalPerguntas) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-brand-navy text-white px-4 pt-12 pb-4">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-white/60 mb-3 text-sm">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="font-bold text-lg">{visita.condominio_nome}</div>
        <div className="text-white/60 text-xs mt-0.5">{visita.condominio_endereco}</div>

        {visita.status === 'em_andamento' && (
          <div className="flex items-center gap-2 mt-2 text-sm text-white/80">
            <Clock size={14} />
            <span>{formatTempo(tempo)}</span>
          </div>
        )}
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Progresso */}
        {totalPerguntas > 0 && (
          <div className="card p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-gray-700">Progresso</span>
              <span className="text-gray-500">{respostas.filter((r: any) => r.resultado).length}/{totalPerguntas}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-green rounded-full transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">{progresso}% concluído</div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3 text-center">
            <div className="text-xl font-bold text-green-600">{totalOk}</div>
            <div className="text-xs text-gray-500">Conforme</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-xl font-bold text-red-600">{respostas.filter((r: any) => r.resultado === 'nao_ok').length}</div>
            <div className="text-xs text-gray-500">Não conforme</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-xl font-bold text-orange-500">{pendencias.length}</div>
            <div className="text-xs text-gray-500">Pendências</div>
          </div>
        </div>

        {/* Ações principais */}
        <div className="space-y-2">
          {visita.status === 'nao_iniciada' && (
            <button onClick={() => executarAcao('iniciar')} disabled={!!acao} className="btn-success w-full">
              <Play size={18} /> Iniciar vistoria
            </button>
          )}
          {visita.status === 'pausada' && (
            <button onClick={() => executarAcao('iniciar')} disabled={!!acao} className="btn-success w-full">
              <Play size={18} /> Retomar vistoria
            </button>
          )}
          {visita.status === 'em_andamento' && (
            <>
              <button
                onClick={() => navigate(`/visita/${id}/checklist`)}
                className="btn-primary w-full"
              >
                <CheckSquare size={18} /> Responder checklist
              </button>
              <button onClick={() => executarAcao('pausar')} disabled={!!acao} className="btn-ghost w-full border border-gray-200">
                <Pause size={18} /> Pausar vistoria
              </button>
            </>
          )}
        </div>

        {/* Checklist e mensagem */}
        {(visita.status === 'em_andamento' || visita.status === 'pausada') && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setShowMsg(true)} className="card p-4 flex flex-col items-center gap-2 text-gray-600 active:scale-95 transition-transform">
              <MessageSquare size={22} className="text-brand-navy" />
              <span className="text-sm font-medium">Mensagem</span>
            </button>
            <button onClick={() => setShowFinalizar(true)} className="card p-4 flex flex-col items-center gap-2 text-gray-600 active:scale-95 transition-transform">
              <Send size={22} className="text-orange-500" />
              <span className="text-sm font-medium">Finalizar</span>
            </button>
          </div>
        )}

        {/* Pendências */}
        {pendencias.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center gap-2 font-bold text-gray-900 mb-3">
              <AlertTriangle size={16} className="text-orange-500" /> Pendências
            </div>
            {pendencias.map((p: any) => (
              <div key={p.id} className="border-l-4 border-orange-400 pl-3 py-1 mb-2 bg-orange-50 rounded-r">
                <div className="text-sm font-semibold">{p.titulo}</div>
                <div className="text-xs text-gray-500 capitalize">{p.prioridade}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal finalizar */}
      {showFinalizar && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Finalizar vistoria</h2>
            <p className="text-sm text-gray-500">A vistoria será enviada para aprovação do administrador.</p>
            <textarea
              value={obs} onChange={(e) => setObs(e.target.value)}
              placeholder="Observações finais (opcional)..."
              className="input resize-none" rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  executarAcao('finalizar', { observacoes: obs })
                  setShowFinalizar(false)
                }}
                disabled={!!acao}
                className="btn-primary flex-1"
              >
                <Send size={16} /> Enviar para aprovação
              </button>
              <button onClick={() => setShowFinalizar(false)} className="btn-ghost">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showMsg && <MensagemModal visitaId={id!} onClose={() => setShowMsg(false)} />}
    </div>
  )
}
