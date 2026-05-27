// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { I18nProvider } from '../../i18n'
import { SecretsDetail } from './SecretsDetail'

const env = {
  id: '1',
  name: 'OPENAI_API_KEY',
  profile: 'default',
  enabled: true,
  updatedAt: new Date().toISOString(),
}

describe('SecretsDetail', () => {
  afterEach(cleanup)

  it('calls copy with revealed=false when hidden and true after reveal', () => {
    const onCopy = vi.fn()
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          targetName="dev"
          revealValue=""
          onReveal={() => {}}
          onCopy={onCopy}
          onUpdateValue={() => {}}
        />
      </I18nProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /copy secret/i }))
    fireEvent.click(screen.getByRole('button', { name: /reveal secret/i }))
    fireEvent.click(screen.getByRole('button', { name: /copy secret/i }))

    expect(onCopy).toHaveBeenNthCalledWith(1, false)
    expect(onCopy).toHaveBeenNthCalledWith(2, true)
  })

  it('keeps update button disabled until input has content', () => {
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          targetName="dev"
          revealValue=""
          onReveal={() => {}}
          onCopy={() => {}}
          onUpdateValue={() => {}}
        />
      </I18nProvider>
    )

    const updateButton = screen.getByRole('button', { name: /^update secret value$/i })
    expect(updateButton.getAttribute('disabled')).not.toBeNull()

    fireEvent.change(screen.getByPlaceholderText('Secret value'), { target: { value: 'x' } })
    expect(updateButton.getAttribute('disabled')).toBeNull()
  })

  it('hides secret when clicking eye icon while revealed', async () => {
    const onReveal = vi.fn()
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          targetName="dev"
          revealValue="secret123"
          onReveal={onReveal}
          onCopy={() => {}}
          onUpdateValue={() => {}}
        />
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('secret-reveal-toggle'))

    await waitFor(() => {
      expect(screen.getByTestId('secret-reveal-toggle').getAttribute('aria-label')).toBe('Hide secret')
    })

    fireEvent.click(screen.getByTestId('secret-reveal-toggle'))

    await waitFor(() => {
      expect(screen.getByTestId('secret-reveal-toggle').getAttribute('aria-label')).toBe('Reveal secret')
    })
    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  it('clears edit input after clicking update button', async () => {
    const onUpdateValue = vi.fn().mockResolvedValue(undefined)
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          targetName="dev"
          revealValue=""
          onReveal={() => {}}
          onCopy={() => {}}
          onUpdateValue={onUpdateValue}
        />
      </I18nProvider>
    )

    const input = screen.getByTestId('secret-update-input')
    fireEvent.change(input, { target: { value: 'new-secret' } })

    fireEvent.click(screen.getByTestId('secret-update-button'))

    await waitFor(() => {
      expect(onUpdateValue).toHaveBeenCalledWith('new-secret')
    })
  })

  it('resets reveal state when env changes', () => {
    const { rerender } = render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          targetName="dev"
          revealValue="secret123"
          onReveal={() => {}}
          onCopy={() => {}}
          onUpdateValue={() => {}}
        />
      </I18nProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /reveal secret/i }))

    const env2 = { ...env, id: '2', name: 'NEW_KEY' }
    rerender(
      <I18nProvider>
        <SecretsDetail
          env={env2}
          targetName="dev"
          revealValue=""
          onReveal={() => {}}
          onCopy={() => {}}
          onUpdateValue={() => {}}
        />
      </I18nProvider>
    )

    expect(screen.getByRole('button', { name: /reveal secret/i })).toBeTruthy()
  })
})
