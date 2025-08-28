'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useTranslation } from 'react-i18next'
import { useLocalizedDate } from '@/lib/hooks/useLocalizedDate'
import { Avatar } from '@/components/ui/Avatar'
import { DocumentationModal } from '@/components/ui/DocumentationModal'

type DashboardStats = {
  totalMatrices: number
  totalEntries: number
  totalUsers: number
  recentActivity: Array<{
    id: number
    entity: string
    action: string
    at: string
    user: {
      username: string
      fullName?: string
      email?: string
    } | null
    changes: Record<string, unknown>
  }>
  adminStats?: {
    userStats: {
      total: number
      active: number
      inactive: number
      adminCount: number
      recentRegistrations: number
    }
    matrixStats: {
      total: number
      totalEntries: number
      recentlyModified: number
      pendingChangeRequests: number
    }
    auditStats: {
      totalLogs: number
    }
    systemHealth: {
      database: 'healthy' | 'warning' | 'error'
      auth: 'healthy' | 'warning' | 'error'
      audit: 'healthy' | 'warning' | 'error'
    }
    performanceMetrics: {
      avgResponseTime: number
      errorRate: number
      uptime: number
    }
  }
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const { t } = useTranslation(['dashboard', 'common'])
  const { formatDate, formatDateTime } = useLocalizedDate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDocModalOpen, setIsDocModalOpen] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const res = await fetch('/api/dashboard/stats')
      if (res.ok) {
        const response = await res.json()
        if (response.success && response.data) {
          setStats(response.data)
        }
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2">{t('dashboard')}</h1>
          <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            {t('welcome')}, {session?.user?.name || session?.user?.email}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(new Date())}
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid gap-6 mb-8 ${session?.user?.role === 'admin' ? 'sm:grid-cols-2 lg:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        <Card className="card-hover group">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-blue-50 dark:from-blue-900/200 to-blue-600 rounded-xl shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-200">
              <svg className="w-6 h-6 text-slate-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('matricesCount')}</div>
              {/* <div className="text-2xl font-bold text-slate-900 dark:text-slate-400">{stats?.totalMatrices || 0}</div> */}
              <div className="text-2xl font-bold">{stats?.totalMatrices || 0}</div>
              <div className="text-xs text-green-600 font-medium">+12% {t('thisMonth')}</div>
            </div>
          </div>
        </Card>

        <Card className="card-hover group">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-green-50 dark:from-green-900/200 to-green-600 rounded-xl shadow-lg shadow-green-500/25 group-hover:shadow-green-500/40 transition-all duration-200">
              <svg className="w-6 h-6 text-slate-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('flowEntries')}</div>
              {/* <div className="text-2xl font-bold text-slate-900 dark:text-slate-400">{stats?.totalEntries || 0}</div> */}
              <div className="text-2xl font-bold">{stats?.totalEntries || 0}</div>
              <div className="text-xs text-green-600 font-medium">+8% {t('thisMonth')}</div>
            </div>
          </div>
        </Card>

        <Card className="card-hover group">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-purple-50 dark:from-purple-900/200 to-purple-600 rounded-xl shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-all duration-200">
              <svg className="w-6 h-6 text-slate-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('usersCount')}</div>
              {/* <div className="text-2xl font-bold text-slate-900 dark:text-slate-400">{stats?.totalUsers || 0}</div> */}
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <div className="text-xs text-blue-600 font-medium">{t('activeUsers')}</div>
            </div>
          </div>
        </Card>

        <Card className="card-hover group">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-emerald-50 dark:from-emerald-900/200 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-all duration-200">
              <svg className="w-6 h-6 text-slate-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('rbacSecurity')}</div>
              {/* <div className="text-lg font-bold text-slate-900 dark:text-slate-400">{t('activeUsers')}</div> */}
              <div className="text-lg font-bold">{t('activeUsers')}</div>
              <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                {t('operational')}
              </div>
            </div>
          </div>
        </Card>

        {/* Admin-only System Health Card */}
        {session?.user?.role === 'admin' && (
          <Card className="card-hover group">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-orange-50 dark:from-orange-900/200 to-orange-600 rounded-xl shadow-lg shadow-orange-500/25 group-hover:shadow-orange-500/40 transition-all duration-200">
                <svg className="w-6 h-6 text-slate-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('systemHealth')}</div>
                <div className="flex gap-2 mt-1">
                  <Badge variant={stats?.adminStats?.systemHealth?.database === 'healthy' ? 'success' : stats?.adminStats?.systemHealth?.database === 'warning' ? 'warning' : 'error'} className="text-xs">
                    DB
                  </Badge>
                  <Badge variant={stats?.adminStats?.systemHealth?.auth === 'healthy' ? 'success' : stats?.adminStats?.systemHealth?.auth === 'warning' ? 'warning' : 'error'} className="text-xs">
                    Auth
                  </Badge>
                  <Badge variant={stats?.adminStats?.systemHealth?.audit === 'healthy' ? 'success' : stats?.adminStats?.systemHealth?.audit === 'warning' ? 'warning' : 'error'} className="text-xs">
                    Audit
                  </Badge>
                </div>
                <div className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  {t('operational')}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className={`grid gap-6 ${session?.user?.role === 'admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {/* Quick Actions */}
        <Card className="animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-50 dark:from-blue-900/200 to-purple-600 rounded-lg">
              <svg className="w-5 h-5 text-slate-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            {/* <h2 className="text-lg font-semibold text-slate-500">{t('quickActions')}</h2> */}
            <h2 className="text-lg font-semibold mb-4">{t('quickActions')}</h2>
          </div>
          <div className="space-y-3">
            <Link
              href="/matrices?action=new"
              className="group flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 dark:from-blue-900/20 to-purple-50 dark:to-purple-900/20 rounded-xl hover:from-blue-100 dark:hover:from-blue-800/30 hover:to-purple-100 dark:hover:to-purple-800/30 transition-all duration-200 border border-blue-100 hover:border-blue-200"
            >
              <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-slate-400">{t('createMatrix')}</div>
                <div className="text-sm text-slate-600">{t('newNetworkFlowMatrix')}</div>
              </div>
              <svg className="w-4 h-4 text-slate-400 dark:text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            
            {session?.user?.role === 'admin' && (
              <Link
                href="/users?action=new"
                className="group flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20 rounded-xl hover:from-green-100 dark:hover:from-green-800/30 hover:to-emerald-100 dark:hover:to-emerald-800/30 transition-all duration-200 border border-green-100 hover:border-green-200"
              >
                <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-slate-400">{t('addUser')}</div>
                  <div className="text-sm text-slate-600">{t('createNewAccount')}</div>
                </div>
                <svg className="w-4 h-4 text-slate-400 dark:text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
            
            <Link
              href="/matrices"
              className="group flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl hover:from-slate-100 hover:to-gray-100 transition-all duration-200 border border-slate-100 hover:border-slate-200 dark:border-slate-700"
            >
              <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-slate-400">{t('browseMatrices')}</div>
                <div className="text-sm text-slate-600">{t('viewAllMatrices')}</div>
              </div>
              <svg className="w-4 h-4 text-slate-400 dark:text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </Card>

        {/* Features Overview */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-emerald-50 dark:from-emerald-900/200 to-green-600 rounded-lg">
              <svg className="w-5 h-5 text-slate-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {/* <h2 className="text-lg font-semibold text-slate-500">{t('features')}</h2> */}
            <h2 className="text-lg font-semibold mb-4">{t('features')}</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-green-50 rounded-xl border border-green-100">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-slate-400">{t('accessControl')}</div>
                <div className="text-sm text-slate-600">{t('matrixPermissions')}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-slate-400">{t('importExportCsv')}</div>
                <div className="text-sm text-slate-600">{t('bulkDataManagement')}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-slate-400">{t('versioningAudit')}</div>
                <div className="text-sm text-slate-600">{t('changeTracking')}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 bg-orange-50 rounded-xl border border-orange-100">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-slate-400">{t('approvalWorkflow')}</div>
                <div className="text-sm text-slate-600">{t('changeValidation')}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Admin Quick Actions - Only visible to admins */}
        {session?.user?.role === 'admin' && (
          <Card className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-red-50 dark:from-red-900/200 to-red-600 rounded-lg">
                <svg className="w-5 h-5 text-slate-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold mb-4">{t('adminActions')}</h2>
            </div>
            <div className="space-y-3">
              <Link
                href="/admin-users"
                className="group flex items-center gap-4 p-4 bg-gradient-to-r from-red-50 dark:from-red-900/20 to-pink-50 dark:to-pink-900/20 rounded-xl hover:from-red-100 dark:hover:from-red-800/30 hover:to-pink-100 dark:hover:to-pink-800/30 transition-all duration-200 border border-red-100 hover:border-red-200"
              >
                <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-slate-400">{t('manageUsers')}</div>
                  <div className="text-sm text-slate-600">{stats?.adminStats?.userStats?.inactive || 0} {t('inactiveUsers')}</div>
                </div>
                <svg className="w-4 h-4 text-slate-400 dark:text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              
              <Link
                href="/admin-rbac"
                className="group flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 dark:from-purple-900/20 to-indigo-50 dark:to-indigo-900/20 rounded-xl hover:from-purple-100 dark:hover:from-purple-800/30 hover:to-indigo-100 dark:hover:to-indigo-800/30 transition-all duration-200 border border-purple-100 hover:border-purple-200"
              >
                <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-slate-400">{t('rbacManagement')}</div>
                  <div className="text-sm text-slate-600">{t('rolesAndPermissions')}</div>
                </div>
                <svg className="w-4 h-4 text-slate-400 dark:text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              
              <Link
                href="/admin-system"
                className="group flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 dark:from-orange-900/20 to-yellow-50 dark:to-yellow-900/20 rounded-xl hover:from-orange-100 dark:hover:from-orange-800/30 hover:to-yellow-100 dark:hover:to-yellow-800/30 transition-all duration-200 border border-orange-100 hover:border-orange-200"
              >
                <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-slate-400">{t('systemSettings')}</div>
                  <div className="text-sm text-slate-600">{t('generalConfiguration')}</div>
                </div>
                <svg className="w-4 h-4 text-slate-400 dark:text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </Card>
        )}

        {/* Recent Activity */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-indigo-50 dark:from-indigo-900/200 to-purple-600 rounded-lg">
              <svg className="w-5 h-5 text-slate-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {/* <h2 className="text-lg font-semibold text-slate-500">{t('recentActivity')}</h2> */}
            <h2 className="text-lg font-semibold mb-4">{t('recentActivity')}</h2> 
          </div>
          <div className="space-y-3">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.slice(0, 5).map(activity => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 hover:bg-slate-100 dark:bg-slate-700 transition-colors">
                  <div className="flex items-start gap-2">
                    <Avatar 
                      email={activity.user?.email} 
                      name={activity.user?.fullName || activity.user?.username} 
                      size={32} 
                      showTooltip={true}
                    />
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      activity.action === 'create' ? 'bg-green-100 text-green-700' :
                      activity.action === 'delete' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {activity.action === 'create' ? '+' :
                       activity.action === 'delete' ? '×' : '↻'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-medium text-slate-900 dark:text-slate-400">
                        {activity.user?.fullName || activity.user?.username || t('system')}
                      </span>
                      <span className="text-slate-600">
                        {' '}
                        {activity.action === 'create' && t('created')}
                        {activity.action === 'update' && t('updated')}
                        {activity.action === 'delete' && t('deleted')}
                        {' '}
                        {activity.entity === 'Matrix' && t('matrixEntity')}
                        {activity.entity === 'FlowEntry' && t('entryEntity')}
                        {activity.entity === 'User' && t('userEntity')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {formatDateTime(activity.at)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-400 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-sm text-slate-500">{t('noRecentActivity')}</div>
              </div>
            )}
          </div>
          
          {session?.user?.role === 'admin' && (
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Link
                href="/admin-audit"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                {t('viewAllAuditLogs')} ({stats?.adminStats?.auditStats?.totalLogs || 0})
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Help & Documentation */}
      <Card className="mt-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-50 dark:from-amber-900/200 to-orange-600 rounded-xl">
              <svg className="w-6 h-6 text-slate-600 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              {/* <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-400 mb-1">{t('needHelp')}</h2> */}
              <h2 className="text-lg font-semibold mb-4">{t('needHelp')}</h2>
              <p className="text-slate-600">
                {t('consultDocumentation')}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              className="btn-secondary"
              onClick={() => setIsDocModalOpen(true)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {t('documentation')}
            </button>
            <button className="btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {t('support')}
            </button>
          </div>
        </div>
      </Card>

      <DocumentationModal 
        isOpen={isDocModalOpen} 
        onClose={() => setIsDocModalOpen(false)} 
      />
    </div>
  )
}