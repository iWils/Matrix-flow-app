'use client'
import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import LoginLanguageSelector from '../../components/ui/LoginLanguageSelector'
import { LoginThemeToggle } from '../../components/ui/LoginThemeToggle'
import TwoFactorStep from './TwoFactorStep'

export default function LoginForm() {
  const { t } = useTranslation('login')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials')
  const [pendingUser, setPendingUser] = useState<{ username: string } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  // Check if already logged in
  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        router.push(callbackUrl)
      }
    })
  }, [router, callbackUrl])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      // First, check if user needs 2FA
      const checkResponse = await fetch('/api/auth/check-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const checkData = await checkResponse.json()

      if (!checkResponse.ok) {
        setError(checkData.error || t('invalidCredentials'))
        return
      }

      if (checkData.requires2FA) {
        // User needs 2FA verification
        setStep('2fa')
        setPendingUser({ username })
      } else {
        // No 2FA required, proceed with normal login
        const result = await signIn('credentials', {
          username,
          password,
          redirect: false
        })

        if (result?.error) {
          setError(t('invalidCredentials'))
        } else if (result?.ok) {
          router.push(callbackUrl)
          router.refresh()
        }
      }
    } catch {
      setError(t('connectionError'))
    } finally {
      setLoading(false)
    }
  }

  const handle2FASuccess = async () => {
    if (!pendingUser) return
    
    // After successful 2FA, complete the login with verified2FA flag
    const result = await signIn('credentials', {
      username: pendingUser.username,
      password,
      verified2FA: 'true', // Flag to indicate 2FA was verified
      redirect: false
    })

    if (result?.error) {
      setError(t('invalidCredentials'))
      setStep('credentials')
    } else if (result?.ok) {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  const handle2FABack = () => {
    setStep('credentials')
    setPendingUser(null)
    setError('')
  }

  const handle2FAError = (errorMessage: string) => {
    setError(errorMessage)
  }

  return (
    <div className="w-full max-w-md animate-fade-in">
      {/* Controls bar */}
      <div className="flex items-center justify-end gap-3 mb-6">
        <LoginLanguageSelector />
        <LoginThemeToggle />
      </div>
      
      <div className="glass rounded-3xl p-8 shadow-2xl border border-white/20 backdrop-blur-xl space-y-8">
        {step === 'credentials' ? (
          <>
            {/* Logo and Header */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center mb-6">
                <Image
                  src="/logo.svg"
                  alt="Matrix Flow Logo"
                  width={80}
                  height={80}
                  className="drop-shadow-lg"
                  priority
                />
              </div>
              <h1 className="text-3xl font-bold text-gradient mb-2">Matrix Flow</h1>
              <p className="text-slate-600 dark:text-slate-400">{t('welcomeLogin')}</p>
            </div>

            {error && (
              <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200/50 dark:border-red-800/50 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm animate-slide-up">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {t('username')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="input pl-10 h-12 text-base"
                      placeholder={t('enterUsername')}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {t('password')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pl-10 h-12 text-base"
                      placeholder={t('enterYourPassword')}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !username.trim() || !password.trim()}
                className="btn-primary w-full h-12 text-base font-semibold"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    {t('loggingIn')}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    {t('login')}
                  </div>
                )}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {t('demoAccount')}: <span className="font-mono">admin / admin</span>
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('securedBy')} Matrix Flow • Version 1.0
              </p>
            </div>
          </>
        ) : (
          <>
            {/* 2FA Step */}
            {error && (
              <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200/50 dark:border-red-800/50 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm animate-slide-up">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              </div>
            )}
            
            {pendingUser && (
              <TwoFactorStep
                username={pendingUser.username}
                onSuccess={handle2FASuccess}
                onBack={handle2FABack}
                onError={handle2FAError}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}