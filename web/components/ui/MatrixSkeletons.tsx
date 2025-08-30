import React from 'react'
import { Skeleton } from './Skeleton'
import { Card } from './Card'

// Skeleton pour la page de détail d'une matrice
export const MatrixDetailSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}>
    {/* Header skeleton */}
    <div className="flex items-center justify-between mb-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton width={80} height={32} /> {/* Bouton retour */}
          <Skeleton width={300} height={36} /> {/* Titre */}
          <Skeleton width={60} height={24} /> {/* Badge */}
        </div>
        <Skeleton width={400} height={20} /> {/* Description */}
      </div>
      <div className="flex gap-2">
        <Skeleton width={100} height={40} />
        <Skeleton width={120} height={40} />
        <Skeleton width={140} height={40} />
      </div>
    </div>

    {/* Stats skeleton */}
    <div className="grid grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="p-4">
          <Skeleton width={60} height={16} className="mb-2" />
          <Skeleton width={40} height={28} />
          <Skeleton width={80} height={12} className="mt-1" />
        </Card>
      ))}
    </div>

    {/* Search skeleton */}
    <Card className="mb-6 p-4">
      <div className="flex gap-2 mb-4">
        <Skeleton className="flex-1" height={40} />
        <Skeleton width={120} height={40} />
        <Skeleton width={100} height={40} />
      </div>
    </Card>

    {/* Table skeleton */}
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton width={150} height={24} />
        <div className="flex items-center gap-4">
          <Skeleton width={100} height={16} />
          <Skeleton width={120} height={16} />
        </div>
      </div>

      {/* Table header */}
      <div className="flex gap-4 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
        <Skeleton width={24} height={20} />
        <Skeleton width={120} height={20} />
        <Skeleton width={100} height={20} />
        <Skeleton width={100} height={20} />
        <Skeleton width={80} height={20} />
        <Skeleton width={80} height={20} />
        <Skeleton width={80} height={20} />
        <Skeleton width={100} height={20} />
      </div>

      {/* Table rows */}
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex gap-4 mb-3 py-2">
          <Skeleton width={24} height={16} />
          <div className="w-32 space-y-1">
            <Skeleton width="100%" height={16} />
            <Skeleton width="60%" height={12} />
          </div>
          <div className="w-24 space-y-1">
            <Skeleton width="100%" height={16} />
            <Skeleton width="80%" height={12} />
          </div>
          <div className="w-24 space-y-1">
            <Skeleton width="100%" height={16} />
            <Skeleton width="70%" height={12} />
          </div>
          <Skeleton width={80} height={16} />
          <Skeleton width={60} height={24} />
          <Skeleton width={60} height={16} />
          <div className="flex gap-2">
            <Skeleton width={70} height={32} />
            <Skeleton width={60} height={32} />
          </div>
        </div>
      ))}
    </Card>
  </div>
)

// Skeleton pour la recherche avancée
export const AdvancedSearchSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <Card className={`p-4 ${className || ''}`}>
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="flex-1" height={40} />
        <Skeleton width={140} height={40} />
        <Skeleton width={100} height={40} />
      </div>

      {/* Filtres avancés */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, sectionIndex) => (
            <div key={sectionIndex} className="space-y-3">
              <Skeleton width={100} height={20} />
              {Array.from({ length: 4 }).map((_, fieldIndex) => (
                <div key={fieldIndex} className="space-y-1">
                  <Skeleton width={80} height={14} />
                  <Skeleton width="100%" height={32} />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Skeleton width={80} height={16} className="mb-3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Skeleton width={100} height={14} />
              <Skeleton width="100%" height={32} />
            </div>
            <div className="space-y-1">
              <Skeleton width={80} height={14} />
              <Skeleton width="100%" height={32} />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Skeleton width={120} height={16} />
          <div className="flex gap-2">
            <Skeleton width={100} height={32} />
            <Skeleton width={120} height={32} />
          </div>
        </div>
      </div>
    </div>
  </Card>
)

// Skeleton pour les actions en lot
export const BatchActionsSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 shadow-lg rounded-lg p-4 border border-slate-200 dark:border-slate-700 z-50 ${className || ''}`}>
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Skeleton width={8} height={8} variant="circular" />
        <Skeleton width={180} height={16} />
      </div>

      <div className="flex items-center gap-2">
        <Skeleton width={100} height={32} />
        <Skeleton width={80} height={32} />
        <Skeleton width={80} height={32} />
        <Skeleton width={90} height={32} />
      </div>
    </div>
  </div>
)

// Skeleton pour les statistiques de dashboard
export const DashboardStatsSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className || ''}`}>
    {Array.from({ length: 4 }).map((_, index) => (
      <Card key={index} className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton width="70%" height={16} />
            <Skeleton width="50%" height={32} />
            <Skeleton width="40%" height={12} />
          </div>
          <Skeleton variant="circular" width={48} height={48} />
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Skeleton width={16} height={16} />
            <Skeleton width="60%" height={14} />
          </div>
        </div>
      </Card>
    ))}
  </div>
)

// Skeleton pour les notifications toast
export const ToastSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`max-w-sm w-full shadow-lg rounded-lg border bg-white dark:bg-slate-800 p-4 ${className || ''}`}>
    <div className="flex items-start">
      <Skeleton variant="circular" width={20} height={20} />
      <div className="ml-3 w-0 flex-1">
        <Skeleton width="80%" height={16} className="mb-2" />
        <Skeleton width="100%" height={14} />
      </div>
      <Skeleton width={16} height={16} />
    </div>
  </div>
)

// Skeleton pour la liste des matrices
export const MatrixListSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`space-y-4 ${className || ''}`}>
    {Array.from({ length: 6 }).map((_, index) => (
      <Card key={index} className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton width={200} height={24} />
              <Skeleton width={60} height={20} />
              <Skeleton width={80} height={20} />
            </div>
            <Skeleton width="70%" height={16} />
            <div className="flex items-center gap-4 mt-3">
              <Skeleton width={100} height={14} />
              <Skeleton width={120} height={14} />
              <Skeleton width={80} height={14} />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Skeleton width={80} height={32} />
            <Skeleton width={100} height={32} />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton width={120} height={14} />
              <Skeleton width={100} height={14} />
            </div>
            <Skeleton width={80} height={14} />
          </div>
        </div>
      </Card>
    ))}
  </div>
)

// Skeleton pour les modales
export const ModalSkeleton: React.FC<{ 
  title?: boolean
  fields?: number
  actions?: number
  className?: string 
}> = ({ 
  title = true, 
  fields = 4, 
  actions = 2,
  className 
}) => (
  <div className={`space-y-6 ${className || ''}`}>
    {title && (
      <div className="pb-4 border-b border-slate-200 dark:border-slate-700">
        <Skeleton width={200} height={24} />
      </div>
    )}

    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton width="30%" height={16} />
          <Skeleton width="100%" height={40} />
        </div>
      ))}
    </div>

    <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
      {Array.from({ length: actions }).map((_, index) => (
        <Skeleton key={index} width={120} height={40} className="flex-1" />
      ))}
    </div>
  </div>
)