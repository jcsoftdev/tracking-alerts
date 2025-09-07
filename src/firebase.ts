import { app } from './firebase.config'
import { getDatabase, ref, push, onValue, off, query, orderByChild, DataSnapshot, onChildAdded, get, limitToLast } from 'firebase/database'

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

export async function getLatestTimestamp(): Promise<number | null> {
  const q = query(alertsRef, orderByChild('createdAt'), limitToLast(1))
  const snap = await get(q)
  const data = snap.val() || {}
  const keys = Object.keys(data)
  if (keys.length === 0) return null
  const k = keys[0]
  const item = data[k] as unknown as Omit<AlertItem, 'id'>
  return item?.createdAt ?? null
}

// subscribe only to new child_added events
export function subscribeNewAlerts(cb: (item: AlertItem) => void) {
  const q = query(alertsRef, orderByChild('createdAt'))
  const listener = (snap: DataSnapshot) => {
    const val = snap.val()
    if (!val) return
    const item: AlertItem = { id: snap.key || '', ...(val as Omit<AlertItem, 'id'>) }
    cb(item)
  }

  onChildAdded(q, listener)

  return () => {
    off(q, 'child_added', listener)
  }
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
