import { app } from './firebase.config'
import { getDatabase, ref, push, onValue, off, query, orderByChild, DataSnapshot } from 'firebase/database'

export type AlertItem = {
  id: string
  description: string
  lat: number
  lng: number
  createdAt: number
}

const db = getDatabase(app)
const alertsRef = ref(db, 'alerts')

export async function postAlert(payload: Omit<AlertItem, 'id'>) {
  const p = await push(alertsRef, payload)
  return p.key
}

// callback recibe array de AlertItem
export function subscribeAlerts(cb: (items: AlertItem[]) => void) {
  // ordenamos por createdAt para consistencia
  const q = query(alertsRef, orderByChild('createdAt'))

  const listener = (snap: DataSnapshot) => {
    const data = (snap.val() || {}) as Record<string, Omit<AlertItem, 'id'>>
    const items: AlertItem[] = Object.keys(data).map((k) => ({ id: k, ...(data[k]) }))
    cb(items)
  }

  onValue(q, listener)

  return () => {
    off(q, 'value', listener)
  }
}
