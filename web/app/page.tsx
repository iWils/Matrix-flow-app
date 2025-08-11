
export default function Page(){
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Tableau de bord</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card"><div className="text-slate-500 text-sm">Rôles</div><div className="text-xl font-semibold">Admin / Utilisateur / Visionneur</div></div>
        <div className="card"><div className="text-slate-500 text-sm">RBAC</div><div className="text-xl font-semibold">Par matrice</div></div>
        <div className="card"><div className="text-slate-500 text-sm">CSV</div><div className="text-xl font-semibold">Import & Export</div></div>
      </div>
    </div>
  )
}
