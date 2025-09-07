import { useEffect, useState, useRef } from 'react'
import MapView, { type MapRef } from './components/Map'
import Toasts, { type ToastItem } from './components/Toast'
import './App.css'
import { postAlert, subscribeAlerts, type AlertItem } from './firebase'

function App() {
  // form state
  const [description, setDescription] = useState('')
  const [posting, setPosting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // alerts from realtime DB
  const [alerts, setAlerts] = useState<AlertItem[]>([])

  // toasts
  const [toasts, setToasts] = useState<ToastItem[]>([])

  // map reference
  const mapRef = useRef<MapRef>(null)
  // track IDs posted from this client to avoid notifying the poster
  const myPostedIdsRef = useRef<Set<string>>(new Set())

  // ...existing code...

  useEffect(() => {
    // subscribe to realtime alerts
    let initial = true
    const unsub = subscribeAlerts((items: AlertItem[]) => {
      setAlerts(items)
      if (initial) {
        // mark current alerts as seen to avoid notifications on first load
        const seen: Record<string, boolean> = {}
        items.forEach((a) => (seen[a.id] = true))
        prevAlertsRef.current = seen
        initial = false
      }
    })

    return () => unsub()
  }, [])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  // detect new alerts and notify
  const prevAlertsRef = useRef<Record<string, boolean>>({})

  // play a longer alert sound (alarm-like)
  function playAlertSound() {
  try {
    const win = window as unknown as { AudioContext?: any; webkitAudioContext?: any }
    const AC = win.AudioContext || win.webkitAudioContext
    const ctx: AudioContext = new AC()

    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sawtooth' // más áspero y agresivo
    o.connect(g)
    g.connect(ctx.destination)

    const now = ctx.currentTime
    g.gain.setValueAtTime(0.0001, now)

    // Patrón rápido tipo alarma (beep beep beep)
    for (let i = 0; i < 5; i++) {
      const t = now + i * 0.25
      o.frequency.setValueAtTime(1600, t)
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.20)
    }

    o.start(now)
    setTimeout(() => {
      try {
        o.stop()
      } catch {
        // ignore
      }
      try {
        ctx.close()
      } catch {
        // ignore
      }
    }, 1500) // corta rápido para no saturar
  } catch {
    // ignora errores de audio
  }
}

  useEffect(() => {
    // build map of previous alerts
    const prev = prevAlertsRef.current
  // const currentIds = new Set(alerts.map((a) => a.id))

    // find new alerts (present now, not in prev)
    const newAlerts = alerts.filter((a) => !prev[a.id])
    if (newAlerts.length > 0) {
      newAlerts.forEach((na) => {
        // if this alert was posted by this client, skip notifications and remove tracking
        if (myPostedIdsRef.current.has(na.id)) {
          myPostedIdsRef.current.delete(na.id)
          return
        }

        // play a longer alert sound
        playAlertSound()

        // vibrate on supported devices (mobile)
        try {
          if ('vibrate' in navigator) {
            // pattern: pulse, short pause, pulse, short pause, long pulse
            navigator.vibrate([300, 100, 300, 100, 600])
          }
        } catch (_err) {
          void _err
        }

        // system notification
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Nueva denuncia', { body: na.description })
          } catch (_err) {
            void _err
          }
        }

        // in-app toast
        setToasts((t) => [{ id: na.id, title: 'Nueva denuncia', message: na.description }, ...t])
      })
    }

    // update prev map
    const next: Record<string, boolean> = {}
    alerts.forEach((a) => (next[a.id] = true))
    prevAlertsRef.current = next
  }, [alerts])

  async function handlePost() {
    if (!description.trim()) return
    setPosting(true)
    try {
      const pos = await getCurrentPosition()
      const key = await postAlert({
        description: description.trim(),
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        createdAt: Date.now(),
      })
      if (key) myPostedIdsRef.current.add(key)
      setDescription('')
    } catch (err) {
      console.error(err)
      setNotice('No pudimos obtener la ubicación. Asegúrate de dar permisos.')
    } finally {
      setPosting(false)
    }
  }

  console.log({alerts})

  const handleGoToLocation = (lat: number, lng: number) => {
    if (mapRef.current) {
      mapRef.current.flyToLocation(lat, lng)
    }
  }

  const removeToast = (id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {notice && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded flex justify-between items-start">
            <div className="text-sm text-yellow-800">{notice}</div>
            <button onClick={() => setNotice(null)} className="ml-4 text-yellow-800 font-semibold">Cerrar</button>
          </div>
        )}

        <section className="mb-6">
          <label className="block font-medium text-gray-700 mb-2 text-2xl text-center">Descripción de la alerta</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border border-gray-300 p-2 resize-none"
            rows={3}
            placeholder="Describe lo que está ocurriendo..."
          />
          <div className="flex items-center gap-2 mt-2 justify-center">
            <button
              onClick={handlePost}
              disabled={posting}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {posting ? 'Publicando...' : 'Publicar denuncia'}
            </button>
            
          </div>
        </section>

  <section className="h-96">
          <h2 className="text-xl font-semibold mb-2 text-center">Mapa (denuncias)</h2>
          <div className="w-full h-96 rounded border overflow-hidden">
            <MapView ref={mapRef} alerts={alerts} />
          </div>
        </section>

  <Toasts toasts={toasts} onRemove={removeToast} />

        <section className="mt-12">
          <h3 className="text-md font-medium mb-2">Últimas denuncias</h3>
          <ul className="space-y-2">
            {alerts.slice().reverse().map((a) => (
              <li 
                key={a.id} 
                className="p-2 bg-white rounded shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleGoToLocation(a.lat, a.lng)}
              >
                <div className="text-sm text-gray-700">{a.description}</div>
                <div className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()} • {a.lat.toFixed(5)}, {a.lng.toFixed(5)}</div>
                <div className="text-xs text-blue-600 mt-1">Clic para ver en el mapa</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'))
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

export default App
