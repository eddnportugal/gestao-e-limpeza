import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/auth'
import LoginPage from './pages/LoginPage'
import AdminLayout from './layouts/AdminLayout'
import DashboardPage from './pages/admin/DashboardPage'
import VisitasPage from './pages/admin/VisitasPage'
import VisitaDetailPage from './pages/admin/VisitaDetailPage'
import CondominiosPage from './pages/admin/CondominiosPage'
import UsuariosPage from './pages/admin/UsuariosPage'
import TimelinePage from './pages/admin/TimelinePage'
import SindicoPage from './pages/sindico/SindicoPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Síndico portal — rota pública com token */}
      <Route path="/sindico/:token" element={<SindicoPage />} />

      {/* Admin panel — protegido */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="visitas" element={<VisitasPage />} />
        <Route path="visitas/:id" element={<VisitaDetailPage />} />
        <Route path="condominios" element={<CondominiosPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
