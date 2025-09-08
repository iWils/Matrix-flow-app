// Types pour les modules de performance

export interface MatrixDiffData {
  [key: string]: unknown;
}

export interface DiffEntry {
  type: 'added' | 'removed' | 'changed';
  path: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: {
    fieldType?: string;
    validation?: string;
    impact?: 'low' | 'medium' | 'high';
  };
}

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  algorithm: string;
  checksum?: string;
}

export interface CacheEntry {
  data: unknown;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface QueryOptimization {
  strategy: string;
  estimatedImprovement: number;
  metadata: Record<string, unknown>;
}

export interface SearchIndexData {
  [key: string]: unknown;
  _score?: number;
  _metadata?: {
    indexed: boolean;
    lastUpdate: number;
  };
}

export interface RealtimeUpdate {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
  userId?: number;
  matrixId?: number;
}

export interface DiffViewerData {
  [key: string]: unknown;
  _meta?: {
    type: string;
    path: string[];
    depth: number;
  };
}

export interface HistoryTimelineData {
  [key: string]: unknown;
  timestamp?: number;
  version?: number;
  changes?: DiffEntry[];
}