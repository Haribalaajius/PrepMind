// src/lib/offline-queue.ts  (browser-only)
import type { OfflineQueueItem } from '@/types/domain'

const QUEUE_KEY  = 'pm41_offline_queue'
const MAX_RETRIES = 5

function load(): OfflineQueueItem[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') } catch { return [] }
}

function save(q: OfflineQueueItem[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)) } catch {}
}

export function enqueue(action: 'insert' | 'upsert', table: string, data: Record<string, unknown>) {
  const q = load()
  q.push({ id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, action, table, data, created_at: Date.now(), retries: 0 })
  save(q)
}

export function getQueueSize(): number { return load().length }

export function clearQueue() {
  try { localStorage.removeItem(QUEUE_KEY) } catch {}
}

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  const queue = load()
  if (!queue.length) return { synced: 0, failed: 0 }
  let synced = 0, failed = 0
  const remaining: OfflineQueueItem[] = []

  for (const item of queue) {
    if (item.retries >= MAX_RETRIES) { failed++; continue }   // drop permanently
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      if (res.ok) { synced++ }
      else { remaining.push({ ...item, retries: item.retries + 1 }); failed++ }
    } catch {
      remaining.push({ ...item, retries: item.retries + 1 }); failed++
    }
  }

  save(remaining)
  return { synced, failed }
}
