import { useEffect } from 'react'

export type ToastItem = {
  id: string
  title?: string
  message: string
}

type Props = {
  toasts: ToastItem[]
  onRemove: (id: string) => void
}

export default function Toasts({ toasts, onRemove }: Props) {
  useEffect(() => {
    // auto remove toasts after 5s
    const timers = toasts.map((t) => {
      const id = setTimeout(() => onRemove(t.id), 5000)
      return id
    })
    return () => timers.forEach((id) => clearTimeout(id))
  }, [toasts, onRemove])

  if (!toasts || toasts.length === 0) return null

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ minWidth: 260, background: 'white', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 6px 18px rgba(0,0,0,0.06)', padding: '10px 12px', borderRadius: 8 }}>
          {t.title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.title}</div>}
          <div style={{ fontSize: 13, color: '#333' }}>{t.message}</div>
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <button onClick={() => onRemove(t.id)} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 13 }}>Cerrar</button>
          </div>
        </div>
      ))}
    </div>
  )
}
