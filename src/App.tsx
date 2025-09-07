import { useEffect, useState, useRef } from 'react'
import MapView, { type MapRef } from './components/Map'
import './App.css'
import { postAlert, subscribeAlerts, type AlertItem } from './firebase'

function App() {
  // form state
  const [description, setDescription] = useState('')
  const [posting, setPosting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // alerts from realtime DB
  const [alerts, setAlerts] = useState<AlertItem[]>([])

  // map reference
  const mapRef = useRef<MapRef>(null)

  // ...existing code...

  useEffect(() => {
    // subscribe to realtime alerts
    const unsub = subscribeAlerts((items: AlertItem[]) => {
      setAlerts(items)
    })

    return () => unsub()
  }, [])

  async function handlePost() {
    if (!description.trim()) return
    setPosting(true)
    try {
      const pos = await getCurrentPosition()
      await postAlert({
        description: description.trim(),
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        createdAt: Date.now(),
      })
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
          <label className="block font-medium text-gray-700 mb-2 text-2xl">Descripción de la alerta</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border border-gray-300 p-2 resize-none"
            rows={3}
            placeholder="Describe lo que está ocurriendo..."
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handlePost}
              disabled={posting}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {posting ? 'Publicando...' : 'Publicar denuncia'}
            </button>
            
            <button
              onClick={async () => {
                try {
                  const p = await getCurrentPosition()
                  setNotice(`Ubicación actual: ${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`)
                } catch {
                  setNotice('No se pudo obtener ubicación')
                }
              }}
              className="px-3 py-2 border rounded"
            >
              Obtener ubicación
            </button>
          </div>
        </section>

        <section className="h-96">
          <h2 className="text-lg font-semibold mb-2">Mapa (denuncias)</h2>
          <div className="w-full h-96 rounded border overflow-hidden">
            <MapView ref={mapRef} alerts={alerts} />
          </div>
        </section>

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
