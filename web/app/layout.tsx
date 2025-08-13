import './globals.css'
import { Providers } from './providers'
import { LayoutContent } from './LayoutContent'

export const metadata = {
  title: 'Matrix Flow',
  description: 'Application de gestion des matrices de flux réseau',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          <LayoutContent>{children}</LayoutContent>
        </Providers>
      </body>
    </html>
  )
}