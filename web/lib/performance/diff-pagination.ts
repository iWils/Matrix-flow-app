import { MatrixDiff, DiffEntry } from '@/lib/matrix-diff'

export interface PaginationOptions {
  page: number
  pageSize: number
  sortBy?: 'id' | 'type' | 'changes' | 'impact'
  sortOrder?: 'asc' | 'desc'
  filters?: {
    types?: ('added' | 'modified' | 'removed' | 'unchanged')[]
    search?: string
    impactLevel?: 'low' | 'medium' | 'high'
  }
}

export interface PaginatedDiff {
  entries: DiffEntry[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    pageSize: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  summary: {
    filtered: {
      added: number
      modified: number
      removed: number
      unchanged: number
      total: number
    }
    original: {
      added: number
      modified: number
      removed: number
      unchanged: number
      total: number
    }
  }
}

/**
 * Service de pagination optimisé pour les gros diffs
 * Permet de gérer efficacement les comparaisons avec des milliers d'entrées
 */
export class DiffPaginator {
  private static readonly DEFAULT_PAGE_SIZE = 50
  private static readonly MAX_PAGE_SIZE = 200

  /**
   * Pagine un diff volumineux avec filtres et tri
   */
  static paginate(
    diff: MatrixDiff,
    options: Partial<PaginationOptions> = {}
  ): PaginatedDiff {
    const {
      page = 1,
      pageSize = this.DEFAULT_PAGE_SIZE,
      sortBy = 'id',
      sortOrder = 'asc',
      filters = {}
    } = options

    // Validation des paramètres
    const validatedPageSize = Math.min(Math.max(pageSize, 1), this.MAX_PAGE_SIZE)
    const validatedPage = Math.max(page, 1)

    // Appliquer les filtres
    const filteredEntries = this.applyFilters(diff.entries, filters)

    // Appliquer le tri
    const sortedEntries = this.applySorting(filteredEntries, sortBy, sortOrder)

    // Calculer la pagination
    const totalItems = sortedEntries.length
    const totalPages = Math.ceil(totalItems / validatedPageSize)
    const startIndex = (validatedPage - 1) * validatedPageSize
    const endIndex = Math.min(startIndex + validatedPageSize, totalItems)

    // Extraire la page actuelle
    const pageEntries = sortedEntries.slice(startIndex, endIndex)

    // Calculer les statistiques filtrées
    const filteredSummary = this.calculateSummary(filteredEntries)

    return {
      entries: pageEntries,
      pagination: {
        currentPage: validatedPage,
        totalPages,
        totalItems,
        pageSize: validatedPageSize,
        hasNextPage: validatedPage < totalPages,
        hasPreviousPage: validatedPage > 1
      },
      summary: {
        filtered: filteredSummary,
        original: diff.summary
      }
    }
  }

  /**
   * Génère des pages de diff pour le streaming progressif
   */
  static async *streamPages(
    diff: MatrixDiff,
    options: Partial<PaginationOptions> = {}
  ): AsyncGenerator<PaginatedDiff, void, unknown> {
    const {
      pageSize = this.DEFAULT_PAGE_SIZE,
      sortBy = 'id',
      sortOrder = 'asc',
      filters = {}
    } = options

    // Appliquer les filtres une seule fois
    const filteredEntries = this.applyFilters(diff.entries, filters)
    const sortedEntries = this.applySorting(filteredEntries, sortBy, sortOrder)

    const totalItems = sortedEntries.length
    const totalPages = Math.ceil(totalItems / pageSize)

    for (let page = 1; page <= totalPages; page++) {
      yield this.paginate(diff, { ...options, page })
      
      // Petite pause pour éviter de bloquer l'event loop
      await new Promise(resolve => setImmediate(resolve))
    }
  }

  /**
   * Recherche optimisée dans un diff paginé
   */
  static search(
    diff: MatrixDiff,
    searchTerm: string,
    options: Partial<PaginationOptions> = {}
  ): PaginatedDiff {
    const enhancedFilters = {
      ...options.filters,
      search: searchTerm.toLowerCase()
    }

    return this.paginate(diff, {
      ...options,
      filters: enhancedFilters
    })
  }

  /**
   * Obtient une estimation de la performance pour un diff donné
   */
  static getPerformanceMetrics(diff: MatrixDiff): {
    estimatedRenderTime: number
    recommendedPageSize: number
    shouldPaginate: boolean
    memoryFootprint: string
  } {
    const totalEntries = diff.entries.length
    const averageChangesPerEntry = diff.entries.reduce(
      (sum, entry) => sum + (entry.changes?.length || 0), 0
    ) / totalEntries

    // Estimation basée sur la complexité des entrées
    const complexity = totalEntries * (1 + averageChangesPerEntry * 0.1)
    
    // Temps de rendu estimé en millisecondes
    const estimatedRenderTime = Math.max(100, complexity * 0.5)
    
    // Taille de page recommandée basée sur la complexité
    let recommendedPageSize: number
    if (complexity < 1000) {
      recommendedPageSize = 100
    } else if (complexity < 5000) {
      recommendedPageSize = 50
    } else {
      recommendedPageSize = 25
    }

    // Estimation de l'empreinte mémoire
    const estimatedMemory = totalEntries * 2048 // 2KB par entrée en moyenne
    const memoryFootprint = this.formatBytes(estimatedMemory)

    return {
      estimatedRenderTime,
      recommendedPageSize,
      shouldPaginate: totalEntries > 100 || estimatedRenderTime > 1000,
      memoryFootprint
    }
  }

  /**
   * Applique les filtres aux entrées
   */
  private static applyFilters(
    entries: DiffEntry[],
    filters: PaginationOptions['filters'] = {}
  ): DiffEntry[] {
    let filteredEntries = entries

    // Filtre par type
    if (filters.types && filters.types.length > 0) {
      filteredEntries = filteredEntries.filter(entry => 
        filters.types!.includes(entry.type)
      )
    }

    // Filtre par recherche textuelle
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filteredEntries = filteredEntries.filter(entry => {
        const entryData = entry.entry || entry.newEntry || entry.oldEntry
        if (!entryData) return false

        // Recherche dans les champs principaux
        const searchableText = [
          (entryData as any).rule_name,
          (entryData as any).src_name,
          (entryData as any).dst_name,
          (entryData as any).comment,
          (entryData as any).device,
          entry.changes?.map(c => `${c.field}:${c.oldValue}:${c.newValue}`).join(' ')
        ].filter(Boolean).join(' ').toLowerCase()

        return searchableText.includes(searchTerm)
      })
    }

    // Filtre par niveau d'impact
    if (filters.impactLevel) {
      filteredEntries = filteredEntries.filter(entry => {
        const changeCount = entry.changes?.length || 0
        const hasActionChange = entry.changes?.some(c => c.field === 'action') || false

        switch (filters.impactLevel) {
          case 'low':
            return changeCount <= 2 && !hasActionChange
          case 'medium':
            return changeCount > 2 && changeCount <= 5 && !hasActionChange
          case 'high':
            return changeCount > 5 || hasActionChange
          default:
            return true
        }
      })
    }

    return filteredEntries
  }

  /**
   * Applique le tri aux entrées
   */
  private static applySorting(
    entries: DiffEntry[],
    sortBy: PaginationOptions['sortBy'] = 'id',
    sortOrder: PaginationOptions['sortOrder'] = 'asc'
  ): DiffEntry[] {
    const sortedEntries = [...entries]

    sortedEntries.sort((a, b) => {
      let compareValue = 0

      switch (sortBy) {
        case 'id':
          const idA = a.entry?.id || a.newEntry?.id || a.oldEntry?.id || 0
          const idB = b.entry?.id || b.newEntry?.id || b.oldEntry?.id || 0
          compareValue = idA - idB
          break

        case 'type':
          const typeOrder = { 'removed': 0, 'modified': 1, 'added': 2, 'unchanged': 3 }
          compareValue = (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0)
          break

        case 'changes':
          const changesA = a.changes?.length || 0
          const changesB = b.changes?.length || 0
          compareValue = changesA - changesB
          break

        case 'impact':
          const impactA = this.calculateEntryImpact(a)
          const impactB = this.calculateEntryImpact(b)
          compareValue = impactA - impactB
          break

        default:
          compareValue = 0
      }

      return sortOrder === 'asc' ? compareValue : -compareValue
    })

    return sortedEntries
  }

  /**
   * Calcule le summary pour un ensemble d'entrées
   */
  private static calculateSummary(entries: DiffEntry[]): {
    added: number
    modified: number
    removed: number
    unchanged: number
    total: number
  } {
    const summary = {
      added: 0,
      modified: 0,
      removed: 0,
      unchanged: 0,
      total: entries.length
    }

    entries.forEach(entry => {
      switch (entry.type) {
        case 'added':
          summary.added++
          break
        case 'modified':
          summary.modified++
          break
        case 'removed':
          summary.removed++
          break
        case 'unchanged':
          summary.unchanged++
          break
      }
    })

    return summary
  }

  /**
   * Calcule le score d'impact pour une entrée
   */
  private static calculateEntryImpact(entry: DiffEntry): number {
    let impact = 0

    // Type de changement
    switch (entry.type) {
      case 'removed':
        impact += 10
        break
      case 'modified':
        impact += 5
        break
      case 'added':
        impact += 3
        break
      default:
        impact += 1
    }

    // Nombre de changements
    impact += (entry.changes?.length || 0) * 2

    // Changements critiques
    if (entry.changes) {
      const hasActionChange = entry.changes.some(c => c.field === 'action')
      const hasAllowToDeny = entry.changes.some(c => 
        c.field === 'action' && c.oldValue === 'ALLOW' && c.newValue === 'DENY'
      )

      if (hasAllowToDeny) impact += 20
      else if (hasActionChange) impact += 10
    }

    return impact
  }

  /**
   * Formate les bytes en format lisible
   */
  private static formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    const size = Math.round((bytes / Math.pow(1024, i)) * 100) / 100
    
    return `${size} ${sizes[i]}`
  }
}

/**
 * Hook React pour la pagination de diff (si utilisé côté client)
 */
export function useDiffPagination(
  diff: MatrixDiff,
  initialOptions: Partial<PaginationOptions> = {}
) {
  const paginate = (options: Partial<PaginationOptions> = {}) => {
    return DiffPaginator.paginate(diff, { ...initialOptions, ...options })
  }

  const getPerformanceMetrics = () => {
    return DiffPaginator.getPerformanceMetrics(diff)
  }

  return {
    paginate,
    search: (searchTerm: string, options?: Partial<PaginationOptions>) => 
      DiffPaginator.search(diff, searchTerm, { ...initialOptions, ...options }),
    getPerformanceMetrics,
    streamPages: (options?: Partial<PaginationOptions>) => 
      DiffPaginator.streamPages(diff, { ...initialOptions, ...options })
  }
}