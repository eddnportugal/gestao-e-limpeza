import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Check, X, Minus, Mic, MicOff, Camera,
  ChevronDown, ChevronUp, Loader2
} from 'lucide-react'
import clsx from 'clsx'

type Resultado = 'ok' | 'nao_ok' | 'na' | 'observacao' | null

interface Resposta {
  id?: string
  resultado: Resultado
  observacao: string
  transcricao_corrigida?: string
  gravando?: boolean
}

export default function ChecklistPage() {
  const { id: visitaId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [categorias, setCategorias] = useState<any[]>([])
  const [template, setTemplate] = useState<any>(null)
  const [respostas, setRespostas] = useState<Record<string, Resposta>>({})
  const [expanded, setExpanded] = useState<string>('')
  const [saving, setSaving] = useState<string>('')
  const [transcrevendo, setTranscrevendo] = useState<string>('')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    const carregar = async () => {
      const [visita, cats, resps]: any = await Promise.all([
        api.get(`/visitas/${visitaId}`),
        api.get('/checklist/categorias'),
        api.get(`/checklist/visitas/${visitaId}/respostas`),
      ])

      // Se tem template, busca template
      let templateData = null
      if (visita.template_id) {
        templateData = await api.get(`/checklist/templates/${visita.template_id}`)
        setTemplate(templateData)
      }

      setCategorias(cats)

      // Mapeia respostas existentes
      const map: Record<string, Resposta> = {}
      resps.forEach((r: any) => {
        map[r.pergunta_id] = {
          id: r.id,
          resultado: r.resultado,
          observacao: r.observacao || '',
          transcricao_corrigida: r.transcricao_corrigida,
        }
      })
      setRespostas(map)
      if (cats.length > 0) setExpanded(cats[0].id)
    }
    carregar()
  }, [visitaId])

  const getPerguntas = (categoriaId: string) => {
    if (template) {
      return template.perguntas.filter((p: any) => p.categoria_id === categoriaId)
    }
    return []
  }

  const salvarResposta = async (perguntaId: string, resultado: Resultado, observacao?: string, extra?: any) => {
    setSaving(perguntaId)
    try {
      const body = {
        visita_id: visitaId,
        pergunta_id: perguntaId,
        resultado,
        observacao: observacao ?? respostas[perguntaId]?.observacao ?? '',
        ...extra,
      }
      await api.post('/checklist/respostas', body)
      setRespostas((prev) => ({ ...prev, [perguntaId]: { ...prev[perguntaId], ...body } }))
    } catch {
      toast.error('Erro ao salvar resposta')
    } finally {
      setSaving('')
    }
  }

  const iniciarGravacao = async (perguntaId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => chunksRef.current.push(e.data)
      mr.onstop = () => processarAudio(perguntaId, stream)
      mr.start()
      mediaRef.current = mr
      setRespostas((prev) => ({ ...prev, [perguntaId]: { ...(prev[perguntaId] || { resultado: null, observacao: '' }), gravando: true } }))
    } catch {
      toast.error('Permissão de microfone negada')
    }
  }

  const pararGravacao = (perguntaId: string) => {
    mediaRef.current?.stop()
    setRespostas((prev) => ({ ...prev, [perguntaId]: { ...prev[perguntaId], gravando: false } }))
  }

  const processarAudio = async (perguntaId: string, stream: MediaStream) => {
    stream.getTracks().forEach((t) => t.stop())
    setTranscrevendo(perguntaId)
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const form = new FormData()
      form.append('audio', blob, 'audio.webm')
      form.append('pergunta', perguntaId)

      const res: any = await api.post('/ai/transcrever', form)
      const texto = res.transcricao_corrigida || res.transcricao_bruta || ''

      setRespostas((prev) => ({
        ...prev,
        [perguntaId]: { ...prev[perguntaId], observacao: texto, transcricao_corrigida: res.transcricao_corrigida },
      }))

      // Salva automaticamente com observacao
      await salvarResposta(perguntaId, respostas[perguntaId]?.resultado, texto, {
        transcricao_bruta: res.transcricao_bruta,
        transcricao_corrigida: res.transcricao_corrigida,
      })
      toast.success('Áudio transcrito!')
    } catch {
      toast.error('Erro ao transcrever áudio')
    } finally {
      setTranscrevendo('')
    }
  }

  // Usa categorias padrão quando não tem template
  const categoriasExibidas = template
    ? [...new Set(template.perguntas.map((p: any) => p.categoria_id))].map((cid) => categorias.find((c: any) => c.id === cid)).filter(Boolean)
    : categorias

  const totalRespondidos = Object.values(respostas).filter((r) => r.resultado).length
  const totalPerguntas = template ? template.perguntas.length : 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-brand-navy text-white px-4 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/60 mb-3 text-sm">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="font-bold text-lg">Checklist</div>
        {totalPerguntas > 0 && (
          <div className="text-sm text-white/60 mt-1">{totalRespondidos}/{totalPerguntas} respondidas</div>
        )}
        {totalPerguntas > 0 && (
          <div className="h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-brand-green rounded-full transition-all"
              style={{ width: `${(totalRespondidos / totalPerguntas) * 100}%` }}
            />
          </div>
        )}
      </div>

      {!template && (
        <div className="mx-4 mt-4 card p-4 text-center text-gray-500 text-sm">
          Nenhum template de checklist associado a esta vistoria.
          <br />Entre em contato com o administrador.
        </div>
      )}

      <div className="flex-1 px-4 py-4 space-y-3">
        {categoriasExibidas.map((cat: any) => {
          const perguntas = template ? template.perguntas.filter((p: any) => p.categoria_id === cat.id) : []
          const catRespondidas = perguntas.filter((p: any) => respostas[p.id]?.resultado).length
          const isExpanded = expanded === cat.id

          return (
            <div key={cat.id} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? '' : cat.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100"
              >
                <div className="text-left">
                  <div className="font-semibold text-gray-900 text-sm">{cat.nome}</div>
                  <div className="text-xs text-gray-400">{catRespondidas}/{perguntas.length} respondidas</div>
                </div>
                <div className="flex items-center gap-2">
                  {catRespondidas === perguntas.length && perguntas.length > 0 && (
                    <Check size={14} className="text-green-500" />
                  )}
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </button>

              {isExpanded && perguntas.map((p: any) => {
                const resp = respostas[p.id] || { resultado: null, observacao: '', gravando: false }
                const isSaving = saving === p.id
                const isTranscrevendo = transcrevendo === p.id

                return (
                  <div key={p.id} className="px-4 py-4 border-b border-gray-50 last:border-0">
                    <div className="text-sm font-medium text-gray-800 mb-3">{p.texto}</div>

                    {/* Botões de resultado */}
                    <div className="flex gap-2 mb-3">
                      {(['ok', 'nao_ok', 'na'] as Resultado[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => salvarResposta(p.id, r)}
                          disabled={isSaving}
                          className={clsx(
                            'flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all active:scale-95',
                            resp.resultado === r
                              ? r === 'ok' ? 'bg-green-500 border-green-500 text-white'
                                : r === 'nao_ok' ? 'bg-red-500 border-red-500 text-white'
                                : 'bg-gray-400 border-gray-400 text-white'
                              : 'bg-white border-gray-200 text-gray-500'
                          )}
                        >
                          {r === 'ok' ? '✓ OK' : r === 'nao_ok' ? '✗ Não OK' : '— N/A'}
                        </button>
                      ))}
                    </div>

                    {/* Observação + áudio */}
                    <div className="flex gap-2">
                      <textarea
                        value={resp.observacao}
                        onChange={(e) => {
                          setRespostas((prev) => ({ ...prev, [p.id]: { ...resp, observacao: e.target.value } }))
                        }}
                        onBlur={() => resp.resultado && salvarResposta(p.id, resp.resultado, resp.observacao)}
                        placeholder="Observação (opcional)..."
                        className="input text-xs resize-none flex-1"
                        rows={2}
                      />
                      <button
                        onClick={() => resp.gravando ? pararGravacao(p.id) : iniciarGravacao(p.id)}
                        disabled={isTranscrevendo}
                        className={clsx(
                          'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95',
                          resp.gravando ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500'
                        )}
                      >
                        {isTranscrevendo ? <Loader2 size={18} className="animate-spin" /> : resp.gravando ? <MicOff size={18} /> : <Mic size={18} />}
                      </button>
                    </div>

                    {resp.transcricao_corrigida && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700 italic">
                        IA: "{resp.transcricao_corrigida}"
                      </div>
                    )}

                    {isSaving && <div className="text-xs text-gray-400 mt-1">Salvando...</div>}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
