import { cache } from '@/lib/cache'
import { createHash } from 'crypto'

/**
 * Types pour l'indexation de recherche
 */
export interface SearchIndex {
  terms: Map<string, Set<number>> // terme -> set d'IDs
  documents: Map<number, IndexedDocument> // ID -> document indexé
  metadata: SearchIndexMetadata
}

export interface IndexedDocument {
  id: number
  matrixId: number
  version?: number
  fields: Record<string, string>
  searchableText: string
  weight: number
  lastModified: Date
}

export interface SearchIndexMetadata {
  totalDocuments: number
  totalTerms: number
  lastUpdated: Date
  version: string
  indexSize: number
}

export interface SearchQuery {
  term: string
  filters?: {
    matrixId?: number
    version?: number
    fields?: string[]
    dateRange?: {
      from: Date
      to: Date
    }
  }
  options?: {
    fuzzy?: boolean
    caseSensitive?: boolean
    wholeWords?: boolean
    maxResults?: number
  }
}

export interface SearchResult {
  id: number
  score: number
  highlights: string[]
  document: IndexedDocument
  matchedTerms: string[]
}

/**
 * Moteur d'indexation avancé pour les recherches dans l'historique
 * Utilise des techniques d'indexation inversée pour des performances optimales
 */
export class SearchIndexEngine {
  private static readonly INDEX_VERSION = '1.0'
  private static readonly STOP_WORDS = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'à', 'pour', 'sur', 'dans',
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'
  ])
  
  private static readonly FIELD_WEIGHTS = {
    'rule_name': 3.0,
    'comment': 2.0,
    'src_name': 1.5,
    'dst_name': 1.5,
    'device': 1.2,
    'requester': 1.0,
    'action': 0.8,
    'default': 0.5
  }

  private static indexes = new Map<string, SearchIndex>()

  /**
   * Crée ou met à jour l'index de recherche pour une matrice
   */
  static async buildIndex(
    matrixId: number,
    entries: any[],
    version?: number
  ): Promise<void> {
    const indexKey = this.getIndexKey(matrixId, version)
    
    const index: SearchIndex = {
      terms: new Map(),
      documents: new Map(),
      metadata: {
        totalDocuments: 0,
        totalTerms: 0,
        lastUpdated: new Date(),
        version: this.INDEX_VERSION,
        indexSize: 0
      }
    }

    // Indexer chaque entrée
    entries.forEach(entry => {
      const document = this.createIndexedDocument(entry, matrixId, version)
      index.documents.set(document.id, document)

      // Extraire et indexer les termes
      const terms = this.extractTerms(document.searchableText)
      terms.forEach(term => {
        if (!index.terms.has(term)) {
          index.terms.set(term, new Set())
        }
        index.terms.get(term)!.add(document.id)
      })
    })

    // Mettre à jour les métadonnées
    index.metadata.totalDocuments = index.documents.size
    index.metadata.totalTerms = index.terms.size
    index.metadata.indexSize = this.calculateIndexSize(index)

    // Stocker l'index en mémoire et en cache
    this.indexes.set(indexKey, index)
    await this.cacheIndex(indexKey, index)
  }

  /**
   * Recherche dans l'index avec scoring avancé
   */
  static async search(query: SearchQuery): Promise<SearchResult[]> {
    const indexKey = this.getIndexKey(query.filters?.matrixId, query.filters?.version)
    
    // Récupérer l'index
    let index = this.indexes.get(indexKey)
    if (!index) {
      index = await this.loadIndexFromCache(indexKey)
      if (index) {
        this.indexes.set(indexKey, index)
      }
    }

    if (!index) {
      return []
    }

    // Traiter la requête
    const processedTerms = this.processQuery(query.term, query.options)
    
    // Rechercher les documents correspondants
    const candidateIds = this.findCandidateDocuments(index, processedTerms, query.options)
    
    // Calculer les scores et trier
    const results: SearchResult[] = []
    
    for (const docId of candidateIds) {
      const document = index.documents.get(docId)
      if (!document) continue

      // Appliquer les filtres
      if (!this.applyFilters(document, query.filters)) continue

      const score = this.calculateScore(document, processedTerms, query.term)
      const highlights = this.generateHighlights(document.searchableText, processedTerms)
      const matchedTerms = this.findMatchedTerms(document.searchableText, processedTerms)

      results.push({
        id: docId,
        score,
        highlights,
        document,
        matchedTerms
      })
    }

    // Trier par score décroissant
    results.sort((a, b) => b.score - a.score)

    // Limiter les résultats
    const maxResults = query.options?.maxResults || 100
    return results.slice(0, maxResults)
  }

  /**
   * Recherche floue avec suggestions
   */
  static async fuzzySearch(
    matrixId: number,
    term: string,
    maxDistance: number = 2
  ): Promise<{
    results: SearchResult[]
    suggestions: string[]
  }> {
    const indexKey = this.getIndexKey(matrixId)
    const index = this.indexes.get(indexKey) || await this.loadIndexFromCache(indexKey)
    
    if (!index) {
      return { results: [], suggestions: [] }
    }

    const suggestions: string[] = []
    const allTerms = Array.from(index.terms.keys())
    
    // Trouver les termes similaires
    const similarTerms = allTerms.filter(indexTerm => {
      const distance = this.levenshteinDistance(term.toLowerCase(), indexTerm)
      if (distance <= maxDistance && distance > 0) {
        suggestions.push(indexTerm)
        return true
      }
      return indexTerm.includes(term.toLowerCase()) || term.toLowerCase().includes(indexTerm)
    })

    // Recherche avec les termes similaires
    const results: SearchResult[] = []
    
    for (const similarTerm of similarTerms.slice(0, 10)) {
      const termResults = await this.search({
        term: similarTerm,
        filters: { matrixId },
        options: { maxResults: 5 }
      })
      
      results.push(...termResults.map(result => ({
        ...result,
        score: result.score * 0.8 // Réduire le score pour les matches floues
      })))
    }

    // Supprimer les doublons et trier
    const uniqueResults = Array.from(
      new Map(results.map(r => [r.id, r])).values()
    ).sort((a, b) => b.score - a.score)

    return {
      results: uniqueResults.slice(0, 20),
      suggestions: suggestions.slice(0, 5)
    }
  }

  /**
   * Autocomplétion basée sur l'index
   */
  static async autocomplete(
    matrixId: number,
    prefix: string,
    limit: number = 10
  ): Promise<string[]> {
    const indexKey = this.getIndexKey(matrixId)
    const index = this.indexes.get(indexKey) || await this.loadIndexFromCache(indexKey)
    
    if (!index || prefix.length < 2) {
      return []
    }

    const prefixLower = prefix.toLowerCase()
    const matches: Array<{ term: string; frequency: number }> = []
    
    for (const [term, docIds] of index.terms) {
      if (term.startsWith(prefixLower)) {
        matches.push({
          term,
          frequency: docIds.size
        })
      }
    }

    // Trier par fréquence décroissante
    matches.sort((a, b) => b.frequency - a.frequency)
    
    return matches.slice(0, limit).map(m => m.term)
  }

  /**
   * Obtient les statistiques d'utilisation de la recherche
   */
  static getSearchStats(matrixId: number): Promise<{
    indexSize: number
    totalDocuments: number
    totalTerms: number
    mostSearchedTerms: Array<{ term: string; count: number }>
    lastUpdated: Date
  }> {
    // Implémentation des statistiques
    const indexKey = this.getIndexKey(matrixId)
    const index = this.indexes.get(indexKey)
    
    if (!index) {
      return Promise.resolve({
        indexSize: 0,
        totalDocuments: 0,
        totalTerms: 0,
        mostSearchedTerms: [],
        lastUpdated: new Date()
      })
    }

    // Calculer les termes les plus fréquents
    const termFrequencies: Array<{ term: string; count: number }> = []
    for (const [term, docIds] of index.terms) {
      termFrequencies.push({ term, count: docIds.size })
    }
    termFrequencies.sort((a, b) => b.count - a.count)

    return Promise.resolve({
      indexSize: index.metadata.indexSize,
      totalDocuments: index.metadata.totalDocuments,
      totalTerms: index.metadata.totalTerms,
      mostSearchedTerms: termFrequencies.slice(0, 10),
      lastUpdated: index.metadata.lastUpdated
    })
  }

  /**
   * Invalide l'index pour une matrice
   */
  static async invalidateIndex(matrixId: number, version?: number): Promise<void> {
    const indexKey = this.getIndexKey(matrixId, version)
    
    // Supprimer de la mémoire
    this.indexes.delete(indexKey)
    
    // Supprimer du cache Redis
    await cache.del(`search_index:${indexKey}`)
  }

  // Méthodes privées

  private static createIndexedDocument(
    entry: any,
    matrixId: number,
    version?: number
  ): IndexedDocument {
    const fields: Record<string, string> = {}
    const searchableTexts: string[] = []
    let weight = 1.0

    // Extraire les champs indexables
    const indexableFields = [
      'rule_name', 'comment', 'src_name', 'dst_name', 'device',
      'requester', 'action', 'src_zone', 'dst_zone', 'protocol_group'
    ]

    indexableFields.forEach(field => {
      const value = entry[field]
      if (value && typeof value === 'string') {
        fields[field] = value
        searchableTexts.push(value)
        
        // Ajuster le poids basé sur l'importance du champ
        weight += (this.FIELD_WEIGHTS[field] || this.FIELD_WEIGHTS.default) * 0.1
      }
    })

    const searchableText = searchableTexts.join(' ').toLowerCase()

    return {
      id: entry.id,
      matrixId,
      version,
      fields,
      searchableText,
      weight,
      lastModified: new Date(entry.updatedAt || entry.createdAt || Date.now())
    }
  }

  private static extractTerms(text: string): Set<string> {
    const terms = new Set<string>()
    
    // Nettoyer et diviser le texte
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 2)
      .filter(word => !this.STOP_WORDS.has(word))

    // Ajouter les mots individuels
    words.forEach(word => terms.add(word))

    // Ajouter les bigrammes pour les phrases
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`
      terms.add(bigram)
    }

    return terms
  }

  private static processQuery(
    term: string,
    options: SearchQuery['options'] = {}
  ): string[] {
    if (!options.caseSensitive) {
      term = term.toLowerCase()
    }

    if (options.wholeWords) {
      return [term]
    }

    // Diviser en termes individuels
    return term.split(/\s+/).filter(t => t.length > 0)
  }

  private static findCandidateDocuments(
    index: SearchIndex,
    terms: string[],
    options: SearchQuery['options'] = {}
  ): Set<number> {
    let candidates = new Set<number>()
    let isFirst = true

    for (const term of terms) {
      const termCandidates = new Set<number>()
      
      // Recherche exacte
      const exactMatches = index.terms.get(term)
      if (exactMatches) {
        exactMatches.forEach(id => termCandidates.add(id))
      }

      // Recherche partielle si activée
      if (options.fuzzy || !exactMatches) {
        for (const [indexTerm, docIds] of index.terms) {
          if (indexTerm.includes(term) || term.includes(indexTerm)) {
            docIds.forEach(id => termCandidates.add(id))
          }
        }
      }

      if (isFirst) {
        candidates = termCandidates
        isFirst = false
      } else {
        // Intersection pour AND logique
        candidates = new Set([...candidates].filter(id => termCandidates.has(id)))
      }
    }

    return candidates
  }

  private static applyFilters(
    document: IndexedDocument,
    filters: SearchQuery['filters'] = {}
  ): boolean {
    if (filters.matrixId && document.matrixId !== filters.matrixId) {
      return false
    }

    if (filters.version && document.version !== filters.version) {
      return false
    }

    if (filters.fields && filters.fields.length > 0) {
      const hasMatchingField = filters.fields.some(field => 
        document.fields[field] !== undefined
      )
      if (!hasMatchingField) {
        return false
      }
    }

    if (filters.dateRange) {
      const docDate = document.lastModified
      if (docDate < filters.dateRange.from || docDate > filters.dateRange.to) {
        return false
      }
    }

    return true
  }

  private static calculateScore(
    document: IndexedDocument,
    queryTerms: string[],
    originalQuery: string
  ): number {
    let score = 0

    const text = document.searchableText
    
    // Score de base basé sur le poids du document
    score += document.weight

    // Score pour chaque terme trouvé
    queryTerms.forEach(term => {
      const termCount = (text.match(new RegExp(term, 'gi')) || []).length
      score += termCount * 2

      // Bonus pour les matches dans des champs importants
      Object.entries(document.fields).forEach(([field, value]) => {
        if (value.toLowerCase().includes(term)) {
          const fieldWeight = this.FIELD_WEIGHTS[field] || this.FIELD_WEIGHTS.default
          score += fieldWeight * termCount
        }
      })
    })

    // Bonus pour les matches exacts
    if (text.includes(originalQuery.toLowerCase())) {
      score += 10
    }

    // Pénalité pour les documents anciens
    const daysSinceModified = (Date.now() - document.lastModified.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceModified > 30) {
      score *= 0.9
    }

    return Math.round(score * 100) / 100
  }

  private static generateHighlights(text: string, terms: string[]): string[] {
    const highlights: string[] = []
    
    terms.forEach(term => {
      const regex = new RegExp(`(.{0,30})(${term})(.{0,30})`, 'gi')
      const matches = text.match(regex)
      
      if (matches) {
        matches.slice(0, 3).forEach(match => {
          highlights.push(match.replace(new RegExp(term, 'gi'), `<mark>$&</mark>`))
        })
      }
    })

    return highlights
  }

  private static findMatchedTerms(text: string, terms: string[]): string[] {
    return terms.filter(term => text.includes(term))
  }

  private static getIndexKey(matrixId?: number, version?: number): string {
    return `${matrixId || 'global'}${version ? `:v${version}` : ''}`
  }

  private static async cacheIndex(key: string, index: SearchIndex): Promise<void> {
    try {
      // Sérialiser l'index pour le cache
      const serialized = {
        terms: Array.from(index.terms.entries()).map(([term, ids]) => [term, Array.from(ids)]),
        documents: Array.from(index.documents.entries()),
        metadata: index.metadata
      }

      await cache.set(`search_index:${key}`, serialized, { ttl: 3600 }) // 1 heure
    } catch (error) {
      console.warn('Failed to cache search index:', error)
    }
  }

  private static async loadIndexFromCache(key: string): Promise<SearchIndex | null> {
    try {
      const cached = await cache.get<any>(`search_index:${key}`)
      if (!cached) return null

      // Désérialiser l'index
      const index: SearchIndex = {
        terms: new Map(cached.terms.map(([term, ids]: [string, number[]]) => [term, new Set(ids)])),
        documents: new Map(cached.documents),
        metadata: cached.metadata
      }

      return index
    } catch (error) {
      console.warn('Failed to load search index from cache:', error)
      return null
    }
  }

  private static calculateIndexSize(index: SearchIndex): number {
    // Estimation approximative de la taille de l'index en bytes
    let size = 0
    
    for (const [term, ids] of index.terms) {
      size += term.length * 2 // UTF-16
      size += ids.size * 4 // 4 bytes per int
    }
    
    for (const [id, doc] of index.documents) {
      size += 4 // ID
      size += doc.searchableText.length * 2 // UTF-16
      size += Object.values(doc.fields).join('').length * 2
    }
    
    return size
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }
}