'use client'
// src/app/(auth)/signup/page.tsx
import { useState } from 'react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [dailyHours, setDailyHours] = useState('7')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const sb = getSupabaseBrowserClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    const { error } = await sb.auth.signUp({
      email, password,
      options: {
        data: { full_name: name.trim(), daily_hours: parseInt(dailyHours) },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true); setLoading(false)
  }

  if (success) return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo">PrepMind AIR-1</div>
        <div style={{ fontSize: '36px', margin: '20px 0' }}>📬</div>
        <div className="auth-title">Confirm your email</div>
        <p className="card-p" style={{ marginBottom: '18px' }}>
          We sent a confirmation link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
          Click it to activate your account.
        </p>
        <Link href="/login" className="btn btn-ghost btn-full">Back to Sign In</Link>
      </div>
    </div>
  )

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">PrepMind AIR-1</div>
        <div className="auth-subtitle">GATE EC 2027 — Elite Preparation OS</div>
        <div className="auth-title">Create Account</div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSignup}>
          <div className="inp-g">
            <label>Your Name (optional)</label>
            <input className="form-input" type="text" placeholder="Name"
              value={name} onChange={e => setName(e.target.value)} autoComplete="name"/>
          </div>
          <div className="inp-g">
            <label>Email</label>
            <input className="form-input" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
          </div>
          <div className="inp-g">
            <label>Password</label>
            <input className="form-input" type="password" placeholder="Minimum 8 characters"
              value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password"/>
          </div>
          <div className="inp-g">
            <label>Daily Study Hours</label>
            <select className="form-select" value={dailyHours} onChange={e => setDailyHours(e.target.value)}>
              {['3','5','7','9','12'].map(h => <option key={h} value={h}>{h} hours/day</option>)}
            </select>
          </div>
          <button className="btn btn-acc btn-full btn-lg" type="submit" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <div className="auth-link">
          Already have an account? <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
