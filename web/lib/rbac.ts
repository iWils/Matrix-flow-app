
import { prisma } from './db'

// Interface pour les informations de matrice et permissions
interface MatrixWithPermissions {
  ownerId: number | null;
  permissions: Array<{
    userId: number;
    role: string;
  }>;
}

// Cache pour éviter les requêtes multiples dans la même requête
const matrixPermissionCache = new Map<string, MatrixWithPermissions>();

/**
 * Récupère les informations de matrice et permissions en une seule requête
 */
async function getMatrixPermissions(matrixId: number, userId: number): Promise<MatrixWithPermissions | null> {
  const cacheKey = `${matrixId}-${userId}`;
  
  if (matrixPermissionCache.has(cacheKey)) {
    return matrixPermissionCache.get(cacheKey)!;
  }

  const matrix = await prisma.matrix.findUnique({
    where: { id: matrixId },
    select: {
      ownerId: true,
      permissions: {
        where: { userId },
        select: {
          userId: true,
          role: true
        }
      }
    }
  });

  if (!matrix) return null;

  const result: MatrixWithPermissions = {
    ownerId: matrix.ownerId,
    permissions: matrix.permissions
  };

  // Cache le résultat pour éviter les requêtes répétées
  matrixPermissionCache.set(cacheKey, result);
  
  // Nettoie le cache après 30 secondes pour éviter les données obsolètes
  setTimeout(() => matrixPermissionCache.delete(cacheKey), 30000);

  return result;
}

/**
 * Vérification optimisée des permissions de lecture
 */
export async function canViewMatrix(userId: number, role: string, matrixId: number): Promise<boolean> {
  if (role === 'admin') return true;
  
  const matrixInfo = await getMatrixPermissions(matrixId, userId);
  if (!matrixInfo) return false;
  
  // L'utilisateur est propriétaire
  if (matrixInfo.ownerId === userId) return true;
  
  // L'utilisateur a des permissions explicites (viewer, editor, ou owner)
  return matrixInfo.permissions.length > 0;
}

/**
 * Vérification optimisée des permissions d'édition
 */
export async function canEditMatrix(userId: number, role: string, matrixId: number): Promise<boolean> {
  if (role === 'admin') return true;
  
  const matrixInfo = await getMatrixPermissions(matrixId, userId);
  if (!matrixInfo) return false;
  
  // L'utilisateur est propriétaire
  if (matrixInfo.ownerId === userId) return true;
  
  // L'utilisateur a des permissions d'édition
  const permission = matrixInfo.permissions[0];
  return permission?.role === 'owner' || permission?.role === 'editor';
}

/**
 * Vérification optimisée des permissions de propriétaire
 */
export async function canOwnMatrix(userId: number, role: string, matrixId: number): Promise<boolean> {
  if (role === 'admin') return true;
  
  const matrixInfo = await getMatrixPermissions(matrixId, userId);
  if (!matrixInfo) return false;
  
  // L'utilisateur est propriétaire
  if (matrixInfo.ownerId === userId) return true;
  
  // L'utilisateur a des permissions de propriétaire explicites
  const permission = matrixInfo.permissions[0];
  return permission?.role === 'owner';
}

/**
 * Vérification des permissions pour plusieurs matrices en une seule requête
 */
export async function canViewMultipleMatrices(
  userId: number, 
  role: string, 
  matrixIds: number[]
): Promise<Record<number, boolean>> {
  if (role === 'admin') {
    return matrixIds.reduce((acc, id) => ({ ...acc, [id]: true }), {});
  }

  const matrices = await prisma.matrix.findMany({
    where: { id: { in: matrixIds } },
    select: {
      id: true,
      ownerId: true,
      permissions: {
        where: { userId },
        select: { matrixId: true }
      }
    }
  });

  const result: Record<number, boolean> = {};
  
  for (const matrix of matrices) {
    result[matrix.id] = 
      matrix.ownerId === userId || 
      matrix.permissions.length > 0;
  }
  
  // Assurer que toutes les matrices demandées sont dans le résultat
  for (const id of matrixIds) {
    if (!(id in result)) {
      result[id] = false;
    }
  }

  return result;
}

/**
 * Récupère les informations détaillées des permissions utilisateur pour une matrice
 */
export async function getMatrixUserPermissions(matrixId: number, userId: number) {
  const matrix = await prisma.matrix.findUnique({
    where: { id: matrixId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: {
        select: {
          id: true,
          fullName: true,
          username: true
        }
      },
      permissions: {
        where: { userId },
        select: {
          role: true,
          user: {
            select: {
              fullName: true,
              username: true
            }
          }
        }
      }
    }
  });

  if (!matrix) return null;

  const isOwner = matrix.ownerId === userId;
  const explicitPermission = matrix.permissions[0];

  return {
    matrixId: matrix.id,
    matrixName: matrix.name,
    isOwner,
    ownerInfo: matrix.owner,
    explicitPermission,
    effectiveRole: isOwner ? 'owner' : explicitPermission?.role || null,
    canView: isOwner || !!explicitPermission,
    canEdit: isOwner || explicitPermission?.role === 'owner' || explicitPermission?.role === 'editor',
    canOwn: isOwner || explicitPermission?.role === 'owner'
  };
}

/**
 * Fonction générique pour vérifier les permissions de matrice
 */
export async function checkMatrixPermission(
  userId: number, 
  matrixId: number, 
  permission: 'view' | 'edit' | 'own'
): Promise<boolean> {
  // Pour la compatibilité avec l'API existante, on utilise role comme 'user' par défaut
  // En production, le rôle devrait être passé depuis la session
  const userRole = 'user'; // Simplifié pour les APIs Phase 2
  
  switch (permission) {
    case 'view':
      return canViewMatrix(userId, userRole, matrixId);
    case 'edit':
      return canEditMatrix(userId, userRole, matrixId);
    case 'own':
      return canOwnMatrix(userId, userRole, matrixId);
    default:
      return false;
  }
}

/**
 * Nettoie le cache des permissions (utile pour les tests ou après des modifications)
 */
export function clearPermissionCache(): void {
  matrixPermissionCache.clear();
}
