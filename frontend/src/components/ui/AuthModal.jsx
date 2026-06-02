import { useState } from 'react'
import { X, Eye, EyeOff, Flame } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { authApi } from '../../services/api'

export default function AuthModal() {
  const { authMode, closeAuth, login } = useAuth()
  const [mode, setMode] = useState(authMode)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = mode === 'login'
        ? await authApi.login(form)
        : await authApi.signup(form)
      login(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeAuth} />

      <div className="relative card w-full max-w-md p-8 shadow-2xl animate-slide-up">
        <button onClick={closeAuth} className="absolute top-4 right-4 btn-ghost p-2">
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-flame-500 rounded-lg flex items-center justify-center">
            <Flame size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl">
            news<span className="text-flame-500">verse</span>
          </span>
        </div>

        <h2 className="font-display font-bold text-2xl mb-1">
          {mode === 'login' ? 'Welcome back' : 'Join Newsverse'}
        </h2>
        <p className="text-sm text-ink-500 dark:text-ink-400 mb-6">
          {mode === 'login' ? 'Sign in to vote, comment, and discuss.' : 'Create your account to start discussing.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Username</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="coolnewsreader"
                className="input"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="input pr-10"
              />
              <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              mode === 'login' ? 'Sign in' : 'Create account'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-ink-500 mt-4">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
            className="text-flame-500 hover:text-flame-600 font-medium"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
