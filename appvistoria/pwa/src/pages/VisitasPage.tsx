import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../store/auth'
import { ClipboardList, LogOut, MapPin, Clock, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

const STATUS_LABEL: Record<string, string> = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  pausada: 'Pausada',
  aguardando_aprovacao: 'Aguardando aprovação',
}

const STATUS_COLOR: Record<string, string> = {
  nao_iniciada: 'bg-gray-100 text-gray-600',
  em_andamento: 'bg-blue-100 text-blue-700',
  pausada: 'bg-yellow-100 text-yellow-700',
  aguardando_aprovacao: 'bg-orange-100 text-orange-700',
}

export default function VisitasPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [visitas, setVisitas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/visitas').then((data: any) => {
      setVisitas(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-brand-navy text-white px-4 pt-12 pb-5 safe-top">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="font-bold text-xl">Olá, {user?.nome?.split(' ')[0]}</div>
            <div className="text-white/60 text-sm">Suas vistorias</div>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-white/10 text-white/70">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : visitas.length === 0 ? (
          <div className="card p-10 text-center">
            <ClipboardList size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400 text-sm">Nenhuma vistoria atribuída</p>
          </div>
        ) : visitas.map((v: any) => (
          <button
            key={v.id}
            onClick={() => navigate(`/visita/${v.id}`)}
            className="card w-full p-4 text-left hover:shadow-md transition-shadow active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 text-base truncate">{v.condominio_nome}</div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  <MapPin size={11} /> {v.condominio_endereco || 'Endereço não informado'}
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300 flex-shrink-0 mt-0.5" />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[v.status] || 'bg-gray-100'}`}>
                {STATUS_LABEL[v.status] || v.status}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={11} /> {dayjs(v.criado_em).format('DD/MM/YYYY')}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
