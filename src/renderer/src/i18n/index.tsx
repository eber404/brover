import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import en from './locales/en.json'
import es from './locales/es.json'
import pt from './locales/pt.json'

export type Locale = 'en' | 'es' | 'pt'

const translations: Record<Locale, typeof en> = { en, es, pt }

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let value: unknown = obj
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key]
    } else {
      return path
    }
  }
  return typeof value === 'string' ? value : path
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key
})

const STORAGE_KEY = 'brover-locale'

function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'es' || stored === 'pt') return stored
  } catch {
    // localStorage unavailable (e.g. test environment)
  }
  return 'en'
}

function storeLocale(newLocale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, newLocale)
  } catch {
    // localStorage unavailable
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale)

  const setLocale = useCallback((newLocale: Locale) => {
    storeLocale(newLocale)
    setLocaleState(newLocale)
  }, [])

  const t = useCallback(
    (key: string) => {
      return getNestedValue(translations[locale], key)
    },
    [locale]
  )

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
