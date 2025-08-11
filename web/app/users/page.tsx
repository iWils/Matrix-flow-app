
'use client'
import { useEffect, useState } from 'react'

type User = { id:number, username:string, email?:string, fullName?:string, role:'admin'|'user'|'viewer' }
export default function Users(){
  const [items, setItems] = useState<User[]>([])
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin'|'user'|'viewer'>('viewer')

  async function load(){
    const res = await fetch('/api/users')
    if(res.ok) setItems(await res.json())
  }
  useEffect(()=>{ load() }, [])

  async function create(){
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ username, email, fullName, password, role }) })
    if(res.ok){ setUsername(''); setEmail(''); setFullName(''); setPassword(''); setRole('viewer'); load() }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Utilisateurs</h1>
      <div className="card mb-6">
        <div className="grid md:grid-cols-6 gap-2">
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Nom d'utilisateur" className="border rounded px-3 py-2" />
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email (optionnel)" className="border rounded px-3 py-2" />
          <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Nom complet" className="border rounded px-3 py-2" />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" className="border rounded px-3 py-2" />
          <select value={role} onChange={e=>setRole(e.target.value as any)} className="border rounded px-3 py-2">
            <option value="admin">Administrateur</option><option value="user">Utilisateur</option><option value="viewer">Visionneur</option>
          </select>
          <button onClick={create} className="btn">Créer</button>
        </div>
      </div>
      <div className="card">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500"><tr><th className="py-2">Utilisateur</th><th>Email</th><th>Nom</th><th>Rôle</th></tr></thead>
          <tbody>
            {items.map(u => (
              <tr key={u.id} className="border-t">
                <td className="py-2 font-mono">{u.username}</td>
                <td>{u.email || '-'}</td>
                <td>{u.fullName || '-'}</td>
                <td>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
