import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import {
  LayoutDashboard, Activity, ClipboardList, Building2,
  Users, LogOut, Bell, ChevronDown
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/timeline', icon: Activity, label: 'Timeline' },
  { to: '/visitas', icon: ClipboardList, label: 'Visitas' },
  { to: '/condominios', icon: Building2, label: 'Condomínios' },
  { to: '/usuarios', icon: Users, label: 'Usuários' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [userOpen, setUserOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-brand-navy flex flex-col shadow-xl">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <div className="text-white font-bold text-lg leading-tight">
            AppVistoria
          </div>
          <div className="text-white/50 text-xs tracking-widest uppercase">
            Condominial
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center text-white font-bold text-sm">
              {user?.nome?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 text-left">
              <div className="text-white text-sm font-medium truncate">{user?.nome}</div>
              <div className="text-white/50 text-xs capitalize">{user?.role}</div>
            </div>
            <ChevronDown size={14} className="text-white/50" />
          </button>
          {userOpen && (
            <button
              onClick={handleLogout}
              className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-white/10 text-sm transition-all"
            >
              <LogOut size={16} />
              Sair
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
          <div className="text-sm text-gray-500">
            {user?.empresa_nome}
          </div>
          <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <Bell size={20} />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
