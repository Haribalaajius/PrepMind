'use client'
// src/components/dashboard/DashboardShell.tsx
import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { flushQueue, getQueueSize } from '@/lib/offline-queue'
import type { DashboardSummary } from '@/types/domain'
import { FOCUS_MODE_LABELS } from '@/lib/utils/constants'

interface Props {
  userId: string
  email: string
  summary: DashboardSummary
  children: React.ReactNode
}

type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline'

const NAV_ITEMS = [
  { label: 'Strategy',  href: '/dashboard' },
  { label: 'Practice',  href: '/practice' },
  { label: 'Learn',     href: '/learn' },
  { label: 'Doubts',    href: '/doubts' },
  { label: 'Analyze',   href: '/analyze' },
  { label: 'Revise',    href: '/revise' },
  { label: 'Progress',  href: '/progress' },
  { label: 'System',    href: '/system' },
]

interface Toast { id: string; message: string; type?: 'error' | 'success' }

export default function DashboardShell({ userId, email, summary, children }: Props) {
  const router  = useRouter()
  const pathname = usePathname()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced')
  const [queueSize, setQueueSize]   = useState(0)
  const [lastSync,  setLastSync]    = useState('')
  const [toasts,    setToasts]      = useState<Toast[]>([])
  const sb = getSupabaseBrowserClient()

  const addToast = useCallback((message: string, type?: Toast['type']) => {
    const id = `t-${Date.now()}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  // Flush offline queue on mount
  useEffect(() => {
    const size = getQueueSize()
    if (size > 0) {
      setQueueSize(size); setSyncStatus('syncing')
      flushQueue().then(({ synced, failed }) => {
        setSyncStatus(failed > 0 ? 'error' : 'synced')
        setQueueSize(0)
        setLastSync(new Date().toLocaleTimeString())
        if (synced > 0) addToast(`Synced ${synced} offline change${synced !== 1 ? 's' : ''}`)
      })
    } else {
      setLastSync(new Date().toLocaleTimeString())
    }

    const onOnline  = () => { setSyncStatus('syncing'); flushQueue().then(() => { setSyncStatus('synced'); setLastSync(new Date().toLocaleTimeString()) }) }
    const onOffline = () => setSyncStatus('offline')
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [addToast])

  async function handleLogout() {
    await sb.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const { analytics, revision, profile } = summary
  const focusLabel = FOCUS_MODE_LABELS[profile.focus_mode] ?? profile.focus_mode

  return (
    <div className="app-shell">
      {/* Performance bar */}
      <div className="perf-bar">
        <div className="perf-stat">
          <div className={`sync-dot ${syncStatus}`}
            title={`Sync: ${syncStatus}${lastSync ? ' · last synced ' + lastSync : ''}${queueSize > 0 ? ` · ${queueSize} pending` : ''}`}/>
        </div>
        <div className="perf-div"/>
        <div className="perf-stat"><span className="perf-lbl">Accuracy</span><span className="perf-val">{analytics.overall_accuracy > 0 ? analytics.overall_accuracy + '%' : '—'}</span></div>
        <div className="perf-div"/>
        <div className="perf-stat"><span className="perf-lbl">Attempted</span><span className="perf-val">{analytics.total_attempted}</span></div>
        <div className="perf-div"/>
        <div className="perf-stat"><span className="perf-lbl">Streak</span><span className="perf-val">{analytics.streak_days}🔥</span></div>
        <div className="perf-div"/>
        <div className="perf-stat"><span className="perf-lbl">Weak</span><span className="perf-val" style={{ color: 'var(--red)' }}>{analytics.active_weak_topics}</span></div>
        <div className="perf-div"/>
        <div className="perf-stat">
          <span className="perf-lbl">Rev Due</span>
          <span className="perf-val" style={{ color: revision.overdue_count > 0 ? 'var(--red)' : revision.due_today_count > 0 ? 'var(--orange)' : 'var(--accent)' }}>
            {revision.overdue_count > 0 ? `${revision.overdue_count} overdue` : revision.due_today_count > 0 ? `${revision.due_today_count} today` : '0'}
          </span>
        </div>
        <div className="perf-div"/>
        <div className="perf-stat"><span className="perf-lbl">Mocks</span><span className="perf-val">{analytics.total_tests}</span></div>
        <div className="perf-div"/>
        <div className="perf-stat"><span className="perf-lbl">Mode</span><span className="perf-badge">{focusLabel}</span></div>
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="header-logo">PrepMind <span>AIR-1</span> <span className="ver">v4.1</span></div>
        <div className="header-pill">🎯 GATE EC {profile.target_year}</div>
        <div className="header-spacer"/>
        <div className="header-user">👤 {profile.full_name ?? email.split('@')[0]}</div>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign Out</button>
      </header>

      {/* Main nav */}
      <nav className="main-nav">
        {NAV_ITEMS.map(n => (
          <Link key={n.href} href={n.href} className={`main-tab ${(pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href))) ? 'active' : ''}`}>
            {n.label}
          </Link>
        ))}
      </nav>

      {/* Page content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast show ${t.type ?? ''}`}>{t.message}</div>
        ))}
      </div>
    </div>
  )
}
