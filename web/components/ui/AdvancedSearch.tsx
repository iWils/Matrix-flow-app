'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { Input } from './Input'
import { Card } from './Card'

export interface SearchFilters {
  query?: string
  rule_name?: string
  src_zone?: string
  src_cidr?: string
  dst_zone?: string
  dst_cidr?: string
  dst_service?: string
  protocol_group?: string
  action?: string
  rule_status?: string
  requester?: string
  device?: string
  comment?: string
  dateFrom?: string
  dateTo?: string
}

interface AdvancedSearchProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  onSearch: () => void
  onReset: () => void
  isLoading?: boolean
  showAdvanced?: boolean
}

export function AdvancedSearch({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
  isLoading = false,
  showAdvanced = false
}: AdvancedSearchProps) {
  const { t } = useTranslation(['common', 'matrices'])
  const [expanded, setExpanded] = useState(showAdvanced)

  const handleInputChange = (field: keyof SearchFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== ''
  )

  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== undefined && value !== ''
  ).length

  return (
    <Card className="mb-6">
      <div className="space-y-4">
        {/* Recherche de base */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
placeholder={t('matrices:search.searchPlaceholder')}
              value={filters.query || ''}
              onChange={(e) => handleInputChange('query', e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSearch()}
            />
          </div>
          <Button
            onClick={() => setExpanded(!expanded)}
            variant="outline"
            size="sm"
          >
{expanded ? t('matrices:search.hideFilters') : t('matrices:search.showFilters')}
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </Button>
          <Button onClick={onSearch} disabled={isLoading}>
            {isLoading ? t('matrices:search.searching') : t('matrices:search.search')}
          </Button>
        </div>

        {/* Filtres avancés */}
        {expanded && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Informations de règle */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('matrices:search.rule')}
                </h3>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('matrices:search.ruleName')}
                  </label>
                  <Input
                    type="text"
                    value={filters.rule_name || ''}
                    onChange={(e) => handleInputChange('rule_name', e.target.value)}
placeholder={t('matrices:search.ruleNamePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('matrices:search.device')}
                  </label>
                  <Input
                    type="text"
                    value={filters.device || ''}
                    onChange={(e) => handleInputChange('device', e.target.value)}
placeholder={t('matrices:search.devicePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('matrices:batch.action')}
                  </label>
                  <select
                    value={filters.action || ''}
                    onChange={(e) => handleInputChange('action', e.target.value)}
                    className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700"
                  >
                    <option value="">{t('matrices:search.allActions')}</option>
                    <option value="ALLOW">ALLOW</option>
                    <option value="DENY">DENY</option>
                    <option value="DROP">DROP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('matrices:batch.status')}
                  </label>
                  <select
                    value={filters.rule_status || ''}
                    onChange={(e) => handleInputChange('rule_status', e.target.value)}
                    className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700"
                  >
                    <option value="">{t('matrices:search.allStatuses')}</option>
                    <option value="Active">{t('matrices:batch.active')}</option>
                    <option value="Inactive">{t('matrices:batch.inactive')}</option>
                    <option value="Pending">{t('matrices:batch.pending')}</option>
                    <option value="Disabled">{t('matrices:batch.disabled')}</option>
                  </select>
                </div>
              </div>

              {/* Source et destination */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('matrices:search.sourceDestination')}
                </h3>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('matrices:search.sourceZone')}
                  </label>
                  <Input
                    type="text"
                    value={filters.src_zone || ''}
                    onChange={(e) => handleInputChange('src_zone', e.target.value)}
placeholder={t('matrices:search.sourceZonePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('matrices:search.sourceCidr')}
                  </label>
                  <Input
                    type="text"
                    value={filters.src_cidr || ''}
                    onChange={(e) => handleInputChange('src_cidr', e.target.value)}
placeholder={t('matrices:search.sourceCidrPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('matrices:search.destinationZone')}
                  </label>
                  <Input
                    type="text"
                    value={filters.dst_zone || ''}
                    onChange={(e) => handleInputChange('dst_zone', e.target.value)}
placeholder={t('matrices:search.destinationZonePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('matrices:search.destinationCidr')}
                  </label>
                  <Input
                    type="text"
                    value={filters.dst_cidr || ''}
                    onChange={(e) => handleInputChange('dst_cidr', e.target.value)}
placeholder={t('matrices:search.destinationCidrPlaceholder')}
                  />
                </div>
              </div>

              {/* Services et métadonnées */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('matrices:search.servicesMetadata')}
                </h3>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('matrices:search.servicePort')}
                  </label>
                  <Input
                    type="text"
                    value={filters.dst_service || ''}
                    onChange={(e) => handleInputChange('dst_service', e.target.value)}
placeholder={t('matrices:search.servicePortPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('matrices:search.protocolGroup')}
                  </label>
                  <Input
                    type="text"
                    value={filters.protocol_group || ''}
                    onChange={(e) => handleInputChange('protocol_group', e.target.value)}
placeholder={t('matrices:search.protocolGroupPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('matrices:batch.requester')}
                  </label>
                  <Input
                    type="text"
                    value={filters.requester || ''}
                    onChange={(e) => handleInputChange('requester', e.target.value)}
placeholder={t('matrices:search.requesterPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('matrices:search.commentContains')}
                  </label>
                  <Input
                    type="text"
                    value={filters.comment || ''}
                    onChange={(e) => handleInputChange('comment', e.target.value)}
placeholder={t('matrices:search.commentPlaceholder')}
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                {t('matrices:search.period')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('matrices:search.startDate')}
                  </label>
                  <Input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => handleInputChange('dateFrom', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('matrices:search.endDate')}
                  </label>
                  <Input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => handleInputChange('dateTo', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {hasActiveFilters ? (
                  <span>{t('matrices:search.activeFiltersCount', { count: activeFiltersCount })}</span>
                ) : (
                  <span>{t('matrices:search.noActiveFilters')}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReset}
                  disabled={!hasActiveFilters || isLoading}
                >
                  {t('matrices:search.reset')}
                </Button>
                <Button
                  size="sm"
                  onClick={onSearch}
                  disabled={isLoading}
                >
                  {t('matrices:search.applyFilters')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}