'use client'
import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { useLanguage } from '../providers/LanguageProvider'
import { Language, languages } from '../../lib/i18n'

interface LanguageModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LanguageModal({ isOpen, onClose }: LanguageModalProps) {
  const { language: currentLanguage, setLanguage, t } = useLanguage()
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(currentLanguage)

  const handleSave = () => {
    setLanguage(selectedLanguage)
    onClose()
  }

  const languageFlags: Record<Language, string> = {
    fr: '🇫🇷',
    en: '🇬🇧',
    es: '🇪🇸'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('changeLanguage')}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Sélectionnez votre langue préférée pour l'interface.
        </p>
        
        <div className="space-y-2">
          {(Object.keys(languages) as Language[]).map((lang) => (
            <label
              key={lang}
              className={`
                flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                ${selectedLanguage === lang
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }
              `}
            >
              <input
                type="radio"
                name="language"
                value={lang}
                checked={selectedLanguage === lang}
                onChange={(e) => setSelectedLanguage(e.target.value as Language)}
                className="sr-only"
              />
              <span className="text-2xl">{languageFlags[lang]}</span>
              <div className="flex-1">
                <div className="font-medium">{languages[lang]}</div>
                <div className="text-sm text-slate-500">
                  {lang === 'fr' && 'Français'}
                  {lang === 'en' && 'English'}
                  {lang === 'es' && 'Español'}
                </div>
              </div>
              {selectedLanguage === lang && (
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
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