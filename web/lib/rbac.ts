
import { prisma } from './db'

export async function canViewMatrix(userId: number, role: string, matrixId: number){
  if(role === 'admin') return true
  
  // Vérifier si l'utilisateur est le propriétaire de la matrice
  const matrix = await prisma.matrix.findUnique({
    where: { id: matrixId },
    select: { ownerId: true }
  })
  if (matrix?.ownerId === userId) return true
  
  // Vérifier les permissions explicites
  const p = await prisma.matrixPermission.findFirst({ where: { matrixId, userId } })
  return !!p
}

export async function canEditMatrix(userId: number, role: string, matrixId: number){
  if(role === 'admin') return true
  
  // Vérifier si l'utilisateur est le propriétaire de la matrice
  const matrix = await prisma.matrix.findUnique({
    where: { id: matrixId },
    select: { ownerId: true }
  })
  if (matrix?.ownerId === userId) return true
  
  // Vérifier les permissions explicites
  const p = await prisma.matrixPermission.findFirst({ where: { matrixId, userId } })
  return p?.role === 'owner' || p?.role === 'editor'
}

export async function canOwnMatrix(userId: number, role: string, matrixId: number){
  if(role === 'admin') return true
  
  // Vérifier si l'utilisateur est le propriétaire de la matrice
  const matrix = await prisma.matrix.findUnique({
    where: { id: matrixId },
    select: { ownerId: true }
  })
  if (matrix?.ownerId === userId) return true
  
  // Vérifier les permissions explicites
  const p = await prisma.matrixPermission.findFirst({ where: { matrixId, userId } })
  return p?.role === 'owner'
}
