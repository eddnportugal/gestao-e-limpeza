import { useEffect, useState } from 'react'
import { useTimeline } from '../../api/hooks'
import { useAuth } from '../../store/auth'
import { io } from 'socket.io-client'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'
import { Activity, MessageSquare, CheckCircle, PauseCircle, Play, Send } from 'lucide-react'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

const STATUS_ICON: Record<string, any> = {
  em_andamento: { icon: Play, color: 'text-blue-500 bg-blue-50' },
  pausada: { icon: PauseCircle, color: 'text-yellow-500 bg-yellow-50' },
  finalizada: { icon: CheckCircle, color: 'text-green-500 bg-green-50' },
  aguardando_aprovacao: { icon: Activity, color: 'text-orange-500 bg-orange-50' },
  aprovada: { icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  enviada_sindico: { icon: Send, color: 'text-purple-500 bg-purple-50' },
}

export default function TimelinePage() {
  const { data: timelineInit = [], refetch } = useTimeline()
  const [eventos, setEventos] = useState<any[]>([])
  const { token } = useAuth()

  useEffect(() => {
    if (timelineInit.length) setEventos(timelineInit)
  }, [timelineInit])

  useEffect(() => {
    if (!token) return
    const WS_URL = import.meta.env.VITE_WS_URL || ''
    const socket = io(WS_URL, { auth: { token } })

    const addEvento = (ev: any) => {
      setEventos((prev) => [ev, ...prev].slice(0, 100))
    }

    socket.on('visita:iniciada', addEvento)
    socket.on('visita:pausada', addEvento)
    socket.on('visita:finalizada', addEvento)
    socket.on('visita:aprovada', addEvento)
    socket.on('mensagem:nova', addEvento)

    return () => { socket.disconnect() }
  }, [token])

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timeline em tempo real</h1>
          <p className="text-sm text-gray-500 mt-1">Acompanhe sua equipe em campo</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-gray-500">Ao vivo</span>
        </div>
      </div>

      <div className="space-y-3">
        {eventos.map((ev: any, i) => {
          const isMensagem = ev.tipo === 'mensagem'
          const cfg = isMensagem
            ? { icon: MessageSquare, color: 'text-gray-500 bg-gray-50' }
            : STATUS_ICON[ev.status] || { icon: Activity, color: 'text-gray-400 bg-gray-50' }

          const Icon = cfg.icon

          return (
            <div key={`${ev.id}-${i}`} className="card p-4 flex gap-4 items-start">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">{ev.supervisor_nome}</span>
                  <span className="text-gray-400 text-sm">·</span>
                  <span className="text-gray-600 text-sm">{ev.condominio_nome}</span>
                </div>
                {isMensagem ? (
                  <p className="text-sm text-gray-700 mt-1 italic">"{ev.texto}"</p>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">
                    Status: <strong>{ev.status}</strong>
                  </p>
                )}
              </div>
              <div className="text-xs text-gray-400 flex-shrink-0">
                {dayjs(ev.momento).fromNow()}
              </div>
            </div>
          )
        })}

        {eventos.length === 0 && (
          <div className="card p-12 text-center text-gray-400">
            <Activity size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma atividade nas últimas 24 horas</p>
          </div>
        )}
      </div>
    </div>
  )
}
