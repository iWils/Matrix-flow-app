'use client'
import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { useTranslation } from 'react-i18next'

interface LanguageModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LanguageModal({ isOpen, onClose }: LanguageModalProps) {
  const { t, i18n } = useTranslation('common')
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'fr')

  const handleSave = async () => {
    try {
      // Update language in i18next
      await i18n.changeLanguage(selectedLanguage)
      
      // Save to user profile
      const response = await fetch('/api/users/language', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: selectedLanguage }),
      })
      
      if (!response.ok) {
        console.error('Failed to save language preference')
      }
      
      onClose()
    } catch (error) {
      console.error('Error saving language:', error)
    }
  }

  const languages = { fr: 'Français', en: 'English', es: 'Español' }
  const languageFlags: Record<string, string> = {
    fr: '🇫🇷',
    en: '🇬🇧',
    es: '🇪🇸'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('changeLanguage')}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Sélectionnez votre langue préférée pour l&apos;interface.
        </p>
        
        <div className="space-y-2">
          {Object.keys(languages).map((lang) => (
            <label
              key={lang}
              className={`
                flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                ${selectedLanguage === lang
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                }
              `}
            >
              <input
                type="radio"
                name="language"
                value={lang}
                checked={selectedLanguage === lang}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="sr-only"
              />
              <span className="text-2xl">{languageFlags[lang]}</span>
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-slate-100">{languages[lang as keyof typeof languages]}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {lang === 'fr' && t('french')}
                  {lang === 'en' && t('english')}
                  {lang === 'es' && t('spanish')}
                </div>
              </div>
              {selectedLanguage === lang && (
                <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </label>
          ))}
        </div>
        
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
          >
            {t('save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}