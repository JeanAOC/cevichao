'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      if (!name.trim()) { setError('Ingresa tu nombre'); setLoading(false); return }
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { display_name: name.trim() } },
      })
      if (error) { setError(error.message); setLoading(false); return }
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🐟</div>
          <h1 className="text-3xl font-black" style={{ color: 'var(--primary)' }}>Cevichao</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Pedidos del equipo</p>
        </div>

        <div className="rounded-2xl p-6 shadow-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {/* Tab switcher */}
          <div className="flex rounded-xl p-1 mb-5" style={{ background: 'var(--bg)' }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={mode === m
                  ? { background: 'var(--primary)', color: 'var(--primary-fg)' }
                  : { color: 'var(--muted)' }
                }
              >
                {m === 'login' ? 'Entrar' : 'Registrarse'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border text-sm outline-none focus:ring-2"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                  style={{ color: 'var(--muted)' }}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm rounded-lg px-3 py-2" style={{ background: '#fef2f2', color: 'var(--danger)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm transition-opacity disabled:opacity-60"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              {loading ? 'Cargando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>

            {mode === 'login' && (
              <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
                ¿Olvidaste tu contraseña?{' '}
                <a
                  href="https://youtu.be/BtLSaxRnIhc?si=6fcn-LSPfHdj3po_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                  style={{ color: 'var(--primary)' }}
                >
                  Haz clic aquí
                </a>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
