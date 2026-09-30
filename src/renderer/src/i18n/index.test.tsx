// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider, useI18n } from './index'

const LOCALE_EXPECTATIONS = [
  { locale: 'en', space: 'Space' },
  { locale: 'es', space: 'Espacio' },
  { locale: 'pt', space: 'Espaco' },
] as const

function TestHarness() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div>
      <div data-testid="locale">{locale}</div>
      <div data-testid="translated">{t('secrets.cancel')}</div>
      <div data-testid="missing">{t('missing.path')}</div>
      <div data-testid="space-label">{t('common.environment')}</div>
      <div data-testid="matching-tooltip">{t('environments.matchingSecretNamesTooltip')}</div>
      <button onClick={() => setLocale('pt')}>set-pt</button>
    </div>
  )
}

describe('i18n', () => {
  function installStorage() {
    const storage = new Map<string, string>()
    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
      clear: () => {
        storage.clear()
      },
    }

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    })
  }

  beforeEach(() => {
    installStorage()
  })

  afterEach(cleanup)

  it('defaults to english and falls back missing keys to path', () => {
    render(
      <I18nProvider>
        <TestHarness />
      </I18nProvider>
    )

    expect(screen.getByTestId('locale').textContent).toBe('en')
    expect(screen.getByTestId('translated').textContent).toBe('Cancel')
    expect(screen.getByTestId('missing').textContent).toBe('missing.path')
  })

  it('hydrates stored locale and persists locale changes', () => {
    window.localStorage.setItem('brover-locale', 'es')

    render(
      <I18nProvider>
        <TestHarness />
      </I18nProvider>
    )

    expect(screen.getByTestId('locale').textContent).toBe('es')

    fireEvent.click(screen.getByText('set-pt'))

    expect(screen.getByTestId('locale').textContent).toBe('pt')
    expect(window.localStorage.getItem('brover-locale')).toBe('pt')
  })

  it('ignores invalid stored locale values', () => {
    window.localStorage.setItem('brover-locale', 'fr')

    render(
      <I18nProvider>
        <TestHarness />
      </I18nProvider>
    )

    expect(screen.getByTestId('locale').textContent).toBe('en')
  })

  it.each(LOCALE_EXPECTATIONS)('translates the space label in $locale', ({ locale, space }) => {
    window.localStorage.setItem('brover-locale', locale)

    render(
      <I18nProvider>
        <TestHarness />
      </I18nProvider>
    )

    expect(screen.getByTestId('space-label').textContent).toBe(space)

    const tooltip = screen.getByTestId('matching-tooltip').textContent ?? ''
    expect(tooltip.toLowerCase()).toContain(space.toLowerCase())
    expect(tooltip.toLowerCase()).not.toContain('environment')
  })
})
