
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './db'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'

const TOKEN_NAME = 'mf_token'
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-super-secret'

export type SessionUser = { id: number, role: 'admin'|'user'|'viewer', email: string }

export async function login(email: string, password: string){
  const user = await prisma.user.findUnique({ where: { email } })
  if(!user) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  if(!ok) return null
  const token = jwt.sign({ sub: String(user.id), role: user.role }, JWT_SECRET, { expiresIn: '12h' })
  cookies().set(TOKEN_NAME, token, { httpOnly: true, sameSite: 'lax', secure: false, path: '/' })
  return { id: user.id, email: user.email, role: user.role }
}

export async function logout(){
  cookies().delete(TOKEN_NAME)
}

export function getUserFromRequest(req: NextRequest): SessionUser | null {
  const token = req.cookies.get(TOKEN_NAME)?.value
  if(!token) return null
  try{
    const payload = jwt.verify(token, JWT_SECRET) as any
    return { id: parseInt(payload.sub), role: payload.role, email: '' }
  }catch{ return null }
}
