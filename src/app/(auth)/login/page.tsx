'use client'
// src/app/(auth)/login/page.tsx
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const nextPath = params.get('next') ?? '/dashboard'
  const authError = params.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(authError === 'auth_callback_failed' ? 'Auth callback failed. Try signing in again.' : '')
  const [magicSent, setMagicSent] = useState(false)

  const sb = getSupabaseBrowserClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push(nextPath)
    router.refresh()
  }

  async function handleMagicLink() {
    if (!email.trim()) { setError('Enter your email address first'); return }
    setLoading(true); setError('')
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${nextPath}` },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setMagicSent(true); setLoading(false)
  }

  if (magicSent) return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo">PrepMind AIR-1</div>
        <div style={{ fontSize: '36px', margin: '20px 0' }}>📬</div>
        <div className="auth-title">Check your email</div>
        <p className="card-p" style={{ marginBottom: '18px' }}>
          Magic link sent to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
          Click the link in your email to sign in.
        </p>
        <button className="btn btn-ghost btn-full" onClick={() => setMagicSent(false)}>
          ← Try another method
        </button>
      </div>
    </div>
  )

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">PrepMind AIR-1</div>
        <div className="auth-subtitle">GATE EC 2027 — Elite Preparation OS</div>
        <div className="auth-title">Sign In</div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="inp-g">
            <label>Email</label>
            <input className="form-input" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" autoFocus/>
          </div>
          <div className="inp-g">
            <label>Password</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"/>
          </div>
          <button className="btn btn-acc btn-full btn-lg" type="submit" disabled={loading} style={{ marginTop: '6px' }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div className="auth-divider">or</div>
        <button className="btn btn-ghost btn-full" onClick={handleMagicLink} disabled={loading}>
          ✉ Send Magic Link
        </button>
        <div className="auth-link">
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  )
}
