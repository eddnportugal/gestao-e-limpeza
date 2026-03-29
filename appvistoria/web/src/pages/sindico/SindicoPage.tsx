import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { CheckCircle, XCircle, Minus, Clock, Building2 } from 'lucide-react'
import dayjs from 'dayjs'

const RESULTADO_ICON: Record<string, any> = {
  ok: { icon: CheckCircle, color: 'text-green-500' },
  nao_ok: { icon: XCircle, color: 'text-red-500' },
  na: { icon: Minus, color: 'text-gray-300' },
}

export default function SindicoPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmado, setConfirmado] = useState(false)
  const [comentario, setComentario] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res: any = await api.get(`/sindico/${token}`)
        setData(res)
        setLoading(false)
      } catch {
        setError('Link inválido ou expirado.')
        setLoading(false)
      }
    }
    load()
  }, [token])

  const handleConfirmar = async () => {
    try {
      await api.post(`/sindico/${token}/confirmar`, { comentario })
      setConfirmado(true)
    } catch {
      alert('Erro ao confirmar. Tente novamente.')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400">Carregando vistoria...</div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-500 text-xl font-bold mb-2">Link inválido</div>
        <div className="text-gray-400">{error}</div>
      </div>
    </div>
  )

  if (confirmado) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center card p-10 max-w-sm">
        <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Confirmado!</h2>
        <p className="text-gray-500 text-sm">Seu recebimento foi registrado. Obrigado!</p>
      </div>
    </div>
  )

  const { visita, respostas = [], pendencias = [] } = data || {}
  const porCategoria = respostas.reduce((acc: any, r: any) => {
    const cat = r.categoria_nome || 'Geral'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(r)
    return acc
  }, {})

  const totalOk = respostas.filter((r: any) => r.resultado === 'ok').length
  const totalNaoOk = respostas.filter((r: any) => r.resultado === 'nao_ok').length
  const pct = respostas.length > 0 ? Math.round((totalOk / respostas.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand-navy text-white py-5 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-sm opacity-60 mb-1">AppVistoria Condominial</div>
          <h1 className="text-2xl font-bold">Relatório de Vistoria</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-5">
        {/* Info card */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Building2 size={24} className="text-brand-navy" />
            <div>
              <div className="font-bold text-gray-900 text-lg">{visita?.condominio_nome}</div>
              <div className="text-sm text-gray-500">{visita?.condominio_endereco}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400 text-xs mb-0.5">Supervisor</div>
              <div className="font-medium text-gray-800">{visita?.supervisor_nome}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-0.5">Data da vistoria</div>
              <div className="font-medium text-gray-800">{visita?.iniciada_em ? dayjs(visita.iniciada_em).format('DD/MM/YYYY') : '—'}</div>
            </div>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="text-center bg-green-50 rounded-xl py-3">
              <div className="text-2xl font-bold text-green-600">{totalOk}</div>
              <div className="text-xs text-gray-500">Conforme</div>
            </div>
            <div className="text-center bg-red-50 rounded-xl py-3">
              <div className="text-2xl font-bold text-red-600">{totalNaoOk}</div>
              <div className="text-xs text-gray-500">Não conforme</div>
            </div>
            <div className="text-center bg-blue-50 rounded-xl py-3">
              <div className="text-2xl font-bold text-blue-600">{pct}%</div>
              <div className="text-xs text-gray-500">Conformidade</div>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-3">
          <h2 className="font-bold text-gray-900">Checklist detalhado</h2>
          {Object.entries(porCategoria).map(([cat, itens]: any) => (
            <div key={cat} className="card overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 font-semibold text-sm text-gray-700">{cat}</div>
              {itens.map((r: any) => {
                const cfg = RESULTADO_ICON[r.resultado] || { icon: Minus, color: 'text-gray-300' }
                const Icon = cfg.icon
                return (
                  <div key={r.id} className="px-4 py-3 border-b border-gray-50 last:border-0 flex items-start gap-3">
                    <Icon size={18} className={`flex-shrink-0 mt-0.5 ${cfg.color}`} />
                    <div>
                      <div className="text-sm text-gray-800">{r.pergunta_texto}</div>
                      {r.transcricao_corrigida && <div className="text-xs text-gray-500 mt-1 italic">"{r.transcricao_corrigida}"</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Pendências */}
        {pendencias.length > 0 && (
          <div className="card p-4">
            <h2 className="font-bold text-gray-900 mb-3">Pendências ({pendencias.length})</h2>
            {pendencias.map((p: any) => (
              <div key={p.id} className="border-l-4 border-orange-400 bg-orange-50 rounded-r-lg px-3 py-2 mb-2">
                <div className="font-semibold text-sm text-gray-800">{p.titulo}</div>
                {p.descricao && <div className="text-xs text-gray-500 mt-0.5">{p.descricao}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Confirmação */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-2">Confirmar recebimento</h2>
          <p className="text-sm text-gray-500 mb-3">Ao confirmar, você declara ter recebido e lido este relatório.</p>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Comentário opcional..."
            className="input resize-none mb-3"
            rows={3}
          />
          <button onClick={handleConfirmar} className="btn-success w-full justify-center">
            <CheckCircle size={16} /> Confirmar recebimento
          </button>
        </div>
      </div>
    </div>
  )
}
