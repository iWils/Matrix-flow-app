// Types liés aux matrices, versions et entrées

import { User } from './auth'

export type MatrixStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export interface Matrix {
  id: number
  name: string
  description?: string | null
  ownerId: number
  owner?: Pick<User, 'username' | 'fullName'>
  publishedVersionId?: number | null
  publishedVersion?: Pick<MatrixVersion, 'version' | 'status'>
  requiredApprovals: number
  createdAt: Date
  updatedAt: Date
  _count?: {
    entries: number
    versions: number
  }
}

export interface MatrixVersion {
  id: number
  matrixId: number
  version: number
  status: MatrixStatus
  note?: string | null
  snapshot: MatrixSnapshot
  createdById: number
  createdBy?: Pick<User, 'username' | 'fullName'>
  approvedById?: number | null
  approvedBy?: Pick<User, 'username' | 'fullName'>
  approvedAt?: Date | null
  requiredApprovals: number
  createdAt: Date
  updatedAt: Date
}

export interface MatrixSnapshot {
  entries: MatrixEntry[]
}

export interface MatrixEntry {
  id: number
  matrixId: number
  row: string
  column: string
  value: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateMatrixData {
  name: string
  description?: string
  requiredApprovals?: number
}

export interface UpdateMatrixData {
  name?: string
  description?: string
  requiredApprovals?: number
}

export interface CreateMatrixEntryData {
  row: string
  column: string
  value: string
}

export interface UpdateMatrixEntryData {
  row?: string
  column?: string
  value?: string
}

export interface CreateMatrixVersionData {
  note?: string
  snapshot: MatrixSnapshot
}

export interface MatrixPermissionData {
  matrixId: number
  userId: number
  role: 'owner' | 'editor' | 'viewer'
}

export interface MatrixExportData {
  format: 'csv' | 'json' | 'excel'
  includeMetadata?: boolean
}

export interface MatrixImportData {
  format: 'csv' | 'json' | 'excel'
  data: any[]
  overwrite?: boolean
}

export interface MatrixStats {
  totalMatrices: number
  totalEntries: number
  totalVersions: number
  recentActivity: {
    matricesCreated: number
    entriesAdded: number
    versionsCreated: number
  }
}

export interface ChangeRequest {
  id: number
  matrixId: string
  matrixName: string
  entryId?: string
  requestType: 'create_entry' | 'update_entry' | 'delete_entry'
  status: 'pending' | 'approved' | 'rejected'
  description: string
  changes: any
  requestedBy: {
    username: string
    fullName?: string
  }
  requestedAt: string
  reviewedBy?: {
    username: string
    fullName?: string
  }
  reviewedAt?: string
  reviewComment?: string | null
}

// Types pour les grilles/tableaux de matrices
export interface MatrixCell {
  row: string
  column: string
  value: string
  editable?: boolean
}

export interface MatrixGrid {
  rows: string[]
  columns: string[]
  cells: Record<string, Record<string, string>>
}

export interface MatrixDisplayData extends Matrix {
  grid?: MatrixGrid
  canEdit: boolean
  canDelete: boolean
  canCreateVersion: boolean
  canApprove: boolean
}

// Types pour les workflows et approbations
export interface WorkflowChange {
  id: number
  matrixId: number
  matrix?: Pick<Matrix, 'name'>
  changeType: 'create' | 'update' | 'delete'
  description: string
  requestedById: number
  requestedBy?: Pick<User, 'username' | 'fullName'>
  status: 'pending' | 'approved' | 'rejected'
  approvedById?: number | null
  approvedBy?: Pick<User, 'username' | 'fullName'>
  approvedAt?: Date | null
  data: any
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowApprovalData {
  status: 'approved' | 'rejected'
  comment?: string
}