import { Suspense } from 'react'
import LoginForm from './LoginForm'

function LoginFallback() {
  return (
    <div className="w-full max-w-md">
      <div className="card space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Matrix Flow</h1>
          <p className="text-slate-600 dark:text-slate-400">Chargement...</p>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 dark:border-slate-400" />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}