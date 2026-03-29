import { useState } from 'react'
import { api } from '../api/client'
import toast from 'react-hot-toast'
import { Send, X } from 'lucide-react'

export default function MensagemModal({ visitaId, onClose }: { visitaId: string; onClose: () => void }) {
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)

  const enviar = async () => {
    if (!texto.trim()) return
    setLoading(true)
    try {
      await api.post('/mensagens', { visita_id: visitaId, texto: texto.trim() })
      toast.success('Mensagem enviada!')
      onClose()
    } catch {
      toast.error('Erro ao enviar mensagem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end z-50">
      <div className="bg-white w-full rounded-t-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Enviar mensagem</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-500">A mensagem será vista pelo administrador em tempo real.</p>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="input resize-none"
          rows={4}
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={enviar} disabled={loading || !texto.trim()} className="btn-primary flex-1">
            <Send size={16} /> Enviar
          </button>
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
        </div>
      </div>
    </div>
  )
}
