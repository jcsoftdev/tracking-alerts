import { app } from './firebase.config'
import { getDatabase, ref, push, onValue, off, query, orderByChild, DataSnapshot, onChildAdded, get, limitToLast, set } from 'firebase/database'

export type AlertItem = {
  id: string
  description: string
  lat: number
  lng: number
  createdAt: number
  clientId?: string
}

const db = getDatabase(app)
const alertsRef = ref(db, 'alerts')

// client id helper: persistent per browser to identify this client
export function getClientId() {
  try {
    const k = 'cdc:clientId'
    let id = localStorage.getItem(k)
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
      localStorage.setItem(k, id)
    }
    return id
  } catch {
    return 'unknown'
  }
}

export function postAlert(payload: Omit<AlertItem, 'id'>) {
  // attach client id to allow reliable filtering on the client side
  const p = push(alertsRef, { ...payload, clientId: getClientId() })
  return p.key
}

// Begin a post by creating a push ref and returning the key and a commit function.
// This allows the caller to record the key locally before the realtime listener fires.
export function beginPostAlert() {
  const p = push(alertsRef)
  const key = p.key || ''
  const commit = async (payload: Omit<AlertItem, 'id'>) => {
    await set(p, { ...payload, clientId: getClientId() })
    return key
  }
  return { key, commit }
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
