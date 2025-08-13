
import { prisma } from './db'

export async function canViewMatrix(userId: number, role: string, matrixId: number){
  if(role === 'admin') return true
  const p = await prisma.matrixPermission.findFirst({ where: { matrixId, userId } })
  return !!p
}
export async function canEditMatrix(userId: number, role: string, matrixId: number){
  if(role === 'admin') return true
  const p = await prisma.matrixPermission.findFirst({ where: { matrixId, userId } })
  return p?.role === 'owner' || p?.role === 'editor'
}
export async function canOwnMatrix(userId: number, role: string, matrixId: number){
  if(role === 'admin') return true
  const p = await prisma.matrixPermission.findFirst({ where: { matrixId, userId } })
  return p?.role === 'owner'
}
