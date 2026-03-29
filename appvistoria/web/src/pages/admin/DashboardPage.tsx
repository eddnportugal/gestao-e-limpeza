import { useVisitas, useCondominios, useUsuarios } from '../../api/hooks'
import { Building2, ClipboardList, Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

const STATUS_COLORS: Record<string, string> = {
  nao_iniciada: '#9ca3af',
  em_andamento: '#3b82f6',
  pausada: '#f59e0b',
  aguardando_aprovacao: '#f97316',
  aprovada: '#10b981',
  enviada_sindico: '#8b5cf6',
  concluida: '#1E3A5F',
}

const STATUS_LABELS: Record<string, string> = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  pausada: 'Pausada',
  aguardando_aprovacao: 'Aguard. aprovação',
  aprovada: 'Aprovada',
  enviada_sindico: 'Enviada ao síndico',
  concluida: 'Concluída',
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: visitas = [] } = useVisitas()
  const { data: condominios = [] } = useCondominios()
  const { data: usuarios = [] } = useUsuarios()

  const statusCount = visitas.reduce((acc: any, v: any) => {
    acc[v.status] = (acc[v.status] || 0) + 1
    return acc
  }, {})

  const pieData = Object.entries(statusCount).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || '#9ca3af',
  }))

  const emAndamento = visitas.filter((v: any) => v.status === 'em_andamento').length
  const aguardando = visitas.filter((v: any) => v.status === 'aguardando_aprovacao').length
  const hoje = visitas.filter((v: any) => dayjs(v.criado_em).isToday()).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">{dayjs().format('dddd, DD [de] MMMM [de] YYYY')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="Total de visitas" value={visitas.length} color="bg-brand-navy" />
        <StatCard icon={Clock} label="Em andamento" value={emAndamento} color="bg-blue-500" />
        <StatCard icon={AlertTriangle} label="Aguard. aprovação" value={aguardando} color="bg-orange-500" />
        <StatCard icon={Building2} label="Condomínios ativos" value={condominios.length} color="bg-brand-green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de status */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Visitas por status</h2>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <PieChart width={180} height={180}>
                <Pie data={pieData} dataKey="value" cx={85} cy={85} innerRadius={50} outerRadius={80}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div className="space-y-2">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-bold ml-auto">{item.value as number}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              Nenhuma visita registrada
            </div>
          )}
        </div>

        {/* Visitas recentes */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Visitas recentes</h2>
          <div className="space-y-2">
            {visitas.slice(0, 5).map((v: any) => (
              <div key={v.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[v.status] || '#9ca3af' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{v.condominio_nome}</div>
                  <div className="text-xs text-gray-500">{v.supervisor_nome}</div>
                </div>
                <div className="text-xs text-gray-400">{dayjs(v.criado_em).fromNow()}</div>
              </div>
            ))}
            {visitas.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">Nenhuma visita</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
