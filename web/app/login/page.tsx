import { Suspense } from 'react'
import LoginForm from './LoginForm'

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md">
        <div className="glass rounded-3xl p-8 shadow-2xl border border-white/20 backdrop-blur-xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Matrix Flow</h1>
            <p className="text-slate-600 dark:text-slate-400">Chargement...</p>
          </div>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata() {
  return {
    title: 'Connexion - Matrix Flow',
    description: 'Connectez-vous à Matrix Flow'
  }
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