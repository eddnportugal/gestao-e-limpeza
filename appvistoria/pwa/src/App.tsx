import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/auth'
import LoginPage from './pages/LoginPage'
import VisitasPage from './pages/VisitasPage'
import VisitaPage from './pages/VisitaPage'
import ChecklistPage from './pages/ChecklistPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><VisitasPage /></RequireAuth>} />
      <Route path="/visita/:id" element={<RequireAuth><VisitaPage /></RequireAuth>} />
      <Route path="/visita/:id/checklist" element={<RequireAuth><ChecklistPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
