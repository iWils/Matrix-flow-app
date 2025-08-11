
'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function Login(){
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [err, setErr] = useState('')

  async function submit(e:any){
    e.preventDefault(); setErr('')
    const res = await signIn('credentials', { username, password, redirect: false })
    if(res?.error){ setErr('Identifiants invalides'); return }
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-3">
        <h1 className="text-xl font-semibold">Connexion</h1>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <div><label className="text-sm">Nom d'utilisateur</label><input value={email} onChange={e=>setNom d'utilisateur(e.target.value)} className="w-full border rounded px-3 py-2" /></div>
        <div><label className="text-sm">Mot de passe</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border rounded px-3 py-2" /></div>
        <button className="btn w-full">Se connecter</button>
      </form>
    </div>
  )
}
