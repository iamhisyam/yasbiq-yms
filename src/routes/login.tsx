import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { signIn } from '#/lib/auth-client'
import { getCurrentSession } from '#/server/auth'
import { useState } from 'react'
import { Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    // Jika sudah login, redirect langsung ke dashboard
    const session = await getCurrentSession()
    if (session) {
      throw redirect({ to: '/siswa' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    try {
      await signIn.email({
        email,
        password,
        fetchOptions: {
          onError: (ctx) => {
            setErrorMsg(ctx.error.message || 'Email atau kata sandi salah.')
            setLoading(false)
          },
          onSuccess: () => {
            setLoading(false)
            navigate({ to: '/dashboard' })
          }
        }
      })
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border-4 border-nb-ink rounded-lg shadow-lg overflow-hidden nb-enter">
        {/* Header */}
        <div className="bg-secondary p-6 border-b-4 border-nb-ink text-center">
          <div className="w-12 h-12 bg-accent border-2 border-nb-ink rounded-lg flex items-center justify-center font-heading font-black text-xl mx-auto shadow-sm mb-3">
            AN
          </div>
          <h2 className="font-heading font-black text-xl text-foreground">Masuk ke Sistem</h2>
          <p className="text-sm text-muted-foreground mt-1">Sistem Manajemen Yayasan Annahl</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-heading font-bold mb-1.5 uppercase tracking-wider text-foreground">
              Alamat Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="w-4 h-4 text-nb-ink-soft" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="nb-input nb-input--icon"
                placeholder="operator@annahl.sch.id"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-heading font-bold mb-1.5 uppercase tracking-wider text-foreground">
              Kata Sandi
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-nb-ink-soft" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="nb-input nb-input--icon pr-9"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-nb-ink transition"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-nb-ink-soft" />
                ) : (
                  <Eye className="w-4 h-4 text-nb-ink-soft" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full nb-btn nb-btn-primary py-2.5 mt-4 text-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Menghubungkan...' : 'Masuk Sekarang'}
          </button>
        </form>

        {/* Footer */}
        <div className="bg-[#FFFDF5] p-4 border-t-2 border-nb-ink text-center">
          <p className="text-sm text-muted-foreground">
            Lupa kata sandi? Hubungi admin yayasan untuk reset credential.
          </p>
        </div>
      </div>
    </div>
  )
}
