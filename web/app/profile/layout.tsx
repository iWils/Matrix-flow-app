import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Profil - Matrix Flow',
  description: 'Gestion du profil utilisateur et des préférences'
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="container mx-auto px-4 py-6">
          <nav className="flex space-x-8">
            <a 
              href="/profile/notifications"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium border-b-2 border-blue-600 dark:border-blue-400 pb-2"
            >
              Notifications
            </a>
            <a 
              href="/profile/security"
              className="text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 pb-2"
            >
              Sécurité
            </a>
            <a 
              href="/profile/preferences"
              className="text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 pb-2"
            >
              Préférences
            </a>
          </nav>
        </div>
      </div>
      
      <main>
        {children}
      </main>
    </div>
  )
}