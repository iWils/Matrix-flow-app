
import './globals.css'
import Link from 'next/link'

export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="fr"><body>
      <div className="min-h-screen grid grid-cols-[240px_1fr]">
        <aside className="bg-slate-900 text-white p-4">
          <div className="font-bold mb-6">Matrix Flow</div>
          <nav className="space-y-2">
            <Nav href="/">Tableau de bord</Nav>
            <Nav href="/matrices">Matrices</Nav>
            <Nav href="/users">Utilisateurs</Nav>
          </nav>
        </aside>
        <main className="p-6">{children}</main>
      </div>
    </body></html>
  )
}

function Nav({ href, children }:{ href:string, children:any }){
  return <Link href={href} className="block py-2 px-3 rounded hover:bg-slate-800/30">{children}</Link>
}
