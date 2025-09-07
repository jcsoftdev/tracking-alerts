import { useEffect, useMemo, forwardRef, useImperativeHandle } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { AlertItem } from '../firebase'
import L from 'leaflet'

type Props = {
  alerts: AlertItem[]
}

export type MapRef = {
  flyToLocation: (lat: number, lng: number) => void
}

function FitBounds({ alerts }: { alerts: AlertItem[] }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    if (!alerts || alerts.length === 0) return

    const latlngs = alerts.map((a) => [a.lat, a.lng] as [number, number])
    try {
      const bounds = L.latLngBounds(latlngs)
      map.fitBounds(bounds, { padding: [40, 40] })
    } catch {
      // ignore
    }
  }, [alerts, map])

  return null
}

function MapController({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap()

  useEffect(() => {
    if (map) {
      onMapReady(map)
    }
  }, [map, onMapReady])

  return null
}

const MapView = forwardRef<MapRef, Props>(({ alerts }, ref) => {
  const center: [number, number] = useMemo(() => {
    return alerts && alerts.length > 0 ? [alerts[alerts.length - 1].lat, alerts[alerts.length - 1].lng] : [0, 0]
  }, [alerts])
  const zoom = alerts && alerts.length > 0 ? 13 : 2

  useImperativeHandle(ref, () => ({
    flyToLocation: (lat: number, lng: number) => {
      if (mapInstance) {
        mapInstance.flyTo([lat, lng], 16, { duration: 1.5 })
      }
    }
  }))

  let mapInstance: L.Map | null = null

  const handleMapReady = (map: L.Map) => {
    mapInstance = map
  }

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController onMapReady={handleMapReady} />
      <FitBounds alerts={alerts} />

      {alerts.map((a) => (
        <CircleMarker key={a.id} center={[a.lat, a.lng]} radius={8} pathOptions={{ color: '#dc2626', fillColor: '#fca5a5', fillOpacity: 0.9 }}>
          <Popup>
            <div style={{ minWidth: 180 }}>
              <div style={{ fontWeight: 600 }}>{a.description}</div>
              <div style={{ fontSize: 12, color: '#555' }}>{new Date(a.createdAt).toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{a.lat.toFixed(5)}, {a.lng.toFixed(5)}</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
})

MapView.displayName = 'MapView'

export default MapView
