'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AppLogo from '@/components/AppLogo'

/** Supabase responde en inglés: se traducen los errores más comunes. */
function friendlyError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'El correo o la contraseña no son correctos.'
  if (m.includes('already registered')) return 'Ese correo ya tiene una cuenta. Prueba entrando.'
  if (m.includes('email not confirmed')) return 'Confirma tu correo antes de entrar (revisa tu bandeja).'
  if (m.includes('at least 6 characters')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera un momento y vuelve a probar.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'No hay conexión. Revisa tu internet.'
  return message
}

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
      if (error) { setError(friendlyError(error.message)); setLoading(false); return }
    } else {
      if (!name.trim()) { setError('Ingresa tu nombre'); setLoading(false); return }
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { display_name: name.trim() } },
      })
      if (error) { setError(friendlyError(error.message)); setLoading(false); return }
    }

    router.push('/inicio')
    router.refresh()
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Toldo a todo el ancho: la entrada al «puesto» */}
      <div className="relative h-5 shrink-0" style={{ background: 'var(--accent)' }}>
        <div className="awning absolute left-0 right-0 top-full" aria-hidden />
      </div>

      {/* Todo se escala con la altura de la pantalla (dvh) para que el login quepa sin deslizar, sea cual sea el tamaño.
          Solo en pantallas muy bajas (celular de lado, teclado abierto) se desliza, y es lo normal. */}
      <div className="flex-1 flex items-center justify-center px-4" style={{ paddingTop: 'clamp(0.5rem, 3dvh, 2rem)', paddingBottom: '1rem' }}>
        {/* Celular de lado (muy bajo): logo a la izquierda y formulario a la derecha */}
        <div className="w-full max-w-sm [@media(max-height:500px)]:max-w-2xl [@media(max-height:500px)]:flex [@media(max-height:500px)]:items-center [@media(max-height:500px)]:gap-8">
          <div className="text-center [@media(max-height:500px)]:flex-1 [@media(max-height:500px)]:mb-0!" style={{ marginBottom: 'clamp(0.5rem, 2.5dvh, 1.5rem)' }}>
            <AppLogo className="mx-auto" style={{ width: 'clamp(3.5rem, 13dvh, 7rem)', height: 'clamp(3.5rem, 13dvh, 7rem)' }} />
            <h1 className="font-extrabold leading-tight" style={{ color: 'var(--primary)', fontSize: 'clamp(1.75rem, 5.5dvh, 2.25rem)' }}>Pedidos</h1>
            <p className="text-sm [@media(max-height:600px)]:hidden [@media(max-height:500px)]:block" style={{ color: 'var(--muted)' }}>Cevichao y cumpleaños del equipo</p>
          </div>

          <div className="rounded-2xl border shadow-card [@media(max-height:500px)]:flex-1 [@media(max-height:500px)]:min-w-0" style={{ background: 'var(--card)', borderColor: 'var(--border)', padding: 'clamp(1rem, 3dvh, 1.5rem)' }}>
            {/* Entrar / Registrarse */}
            <div className="flex rounded-xl p-1" role="tablist" style={{ background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: 'clamp(0.75rem, 2.5dvh, 1.25rem)' }}>
              {(['login', 'register'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => { setMode(m); setError('') }}
                  className="flex-1 min-h-11 rounded-lg text-sm font-bold transition-all"
                  style={mode === m
                    ? { background: 'var(--primary)', color: 'var(--primary-fg)' }
                    : { color: 'var(--muted)' }
                  }
                >
                  {m === 'login' ? 'Entrar' : 'Registrarse'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 'clamp(0.5rem, 2dvh, 1rem)' }}>
              {mode === 'register' && (
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold mb-1">Nombre</label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full px-4 fit-h rounded-xl text-sm"
                    required
                  />
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold mb-1">Correo</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 fit-h rounded-xl text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold mb-1">Contraseña</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 pr-12 fit-h rounded-xl text-sm"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-lg"
                    style={{ color: 'var(--muted)' }}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm font-medium rounded-lg px-3 py-2"
                  style={{ background: 'color-mix(in srgb, var(--danger) 12%, var(--card))', color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full fit-h rounded-xl font-bold text-base transition-opacity disabled:opacity-60"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
              >
                {loading ? 'Cargando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
              </button>

              {mode === 'login' && (
                <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
                  ¿Olvidaste tu contraseña?{' '}
                  <a
                    href="https://youtu.be/BtLSaxRnIhc?si=6fcn-LSPfHdj3po_"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline"
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
    </div>
  )
}
