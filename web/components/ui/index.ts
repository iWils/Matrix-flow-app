// Exports centralisés pour les composants UI
export { Alert } from './Alert';
export { Badge } from './Badge';
export { Button } from './Button';
export { Card } from './Card';
export { ChangeNameModal } from './ChangeNameModal';
export { ChangePasswordModal } from './ChangePasswordModal';
export { DataTable } from './DataTable';
export { Input } from './Input';
export { LanguageModal } from './LanguageModal';
export { LoadingSpinner } from './LoadingSpinner';
export { ManageGroupsModal } from './ManageGroupsModal';
export { Modal } from './Modal';
export { ResetPasswordModal } from './ResetPasswordModal';
export { Skeleton, SkeletonCard, SkeletonTable, SkeletonStats, SkeletonForm } from './Skeleton';
export { Table } from './Table';
export { ThemeToggle } from './ThemeToggle';
export { ToggleUserStatusModal } from './ToggleUserStatusModal';
export { UserMenu } from './UserMenu';

// Phase 2 - Nouveaux composants
export { AdvancedSearch } from './AdvancedSearch';
export { BatchActions } from './BatchActions';
export { ToastProvider, useToast } from './Toast';
export { 
  MatrixDetailSkeleton, 
  AdvancedSearchSkeleton, 
  BatchActionsSkeleton,
  DashboardStatsSkeleton,
  ToastSkeleton,
  MatrixListSkeleton,
  ModalSkeleton
} from './MatrixSkeletons';

// Export des types et interfaces
export type * from './Alert';
export type * from './Badge';
export type * from './Button';
export type * from './Card';
export type * from './ChangeNameModal';
export type * from './ChangePasswordModal';
export type * from './DataTable';
export type * from './Input';
export type * from './LanguageModal';
export type * from './LoadingSpinner';
export type * from './ManageGroupsModal';
export type * from './Modal';
export type * from './ResetPasswordModal';
export type * from './Skeleton';
export type * from './Table';
export type * from './ThemeToggle';
export type * from './ToggleUserStatusModal';
export type * from './UserMenu';

// Phase 2 - Types
export type { SearchFilters } from './AdvancedSearch';
export type { BatchActionType } from './BatchActions';
export type { Toast, ToastVariant } from './Toast';