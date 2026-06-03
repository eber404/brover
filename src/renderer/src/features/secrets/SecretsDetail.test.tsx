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

  it('calls copy with revealed=false when hidden and true after reveal', async () => {
    const onCopy = vi.fn()
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          targetName="dev"
          revealValue=""
          hasValue={true}
          onReveal={() => {}}
          onCopy={onCopy}
          onUpdateValue={() => {}}
        />
      </I18nProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /copy secret/i }))
    expect(onCopy).toHaveBeenCalledWith(false)
  })

  it('shows dots when revealValue is empty', () => {
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          targetName="dev"
          revealValue=""
          hasValue={true}
          onReveal={() => {}}
          onCopy={() => {}}
          onUpdateValue={() => {}}
        />
      </I18nProvider>
    )

    const input = screen.getByTestId('secret-reveal-toggle')
      .closest('div')!
      .parentElement!
      .querySelector('input')!
    expect((input as HTMLInputElement).value).toBe('••••••••')
  })

  it('shows value when revealValue is populated after reveal', async () => {
    const onReveal = vi.fn().mockResolvedValue(undefined)
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          targetName="dev"
          revealValue="secret123"
          hasValue={true}
          onReveal={onReveal}
          onCopy={() => {}}
          onUpdateValue={() => {}}
        />
      </I18nProvider>
    )

    await waitFor(() => {
      const input = screen.getByTestId('secret-reveal-toggle')
        .closest('div')!
        .parentElement!
        .querySelector('input')!
      expect((input as HTMLInputElement).value).toBe('secret123')
    })
  })

  it('keeps dots while reveal is pending and value is still empty', () => {
    const onReveal = vi.fn()
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          targetName="dev"
          revealValue=""
          hasValue={true}
          onReveal={onReveal}
          onCopy={() => {}}
          onUpdateValue={() => {}}
        />
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('secret-reveal-toggle'))

    const input = screen.getByTestId('secret-reveal-toggle')
      .closest('div')!
      .parentElement!
      .querySelector('input')!

    expect(onReveal).toHaveBeenCalled()
    expect((input as HTMLInputElement).value).toBe('••••••••')
  })

  it('keeps update button disabled until input has content', async () => {
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          targetName="dev"
          revealValue=""
          hasValue={true}
          onReveal={() => {}}
          onCopy={() => {}}
          onUpdateValue={() => {}}
        />
      </I18nProvider>
    )

    const updateButton = screen.getByTestId('secret-update-button')
    expect(updateButton.getAttribute('disabled')).not.toBeNull()

    fireEvent.change(screen.getByTestId('secret-update-input'), { target: { value: 'x' } })
    expect(updateButton.getAttribute('disabled')).toBeNull()
  })

  it('clears edit input after clicking update button', async () => {
    const onUpdateValueItem = vi.fn().mockResolvedValue(undefined)
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          targetName="dev"
          revealValue=""
          hasValue={true}
          onReveal={() => {}}
          onCopy={() => {}}
          onUpdateValue={onUpdateValueItem}
        />
      </I18nProvider>
    )

    fireEvent.change(screen.getByTestId('secret-update-input'), { target: { value: 'new-secret' } })
    fireEvent.click(screen.getByTestId('secret-update-button'))

    await waitFor(() => {
      expect(onUpdateValueItem).toHaveBeenCalledWith('new-secret')
    })
  })

  it('resets isRevealed to false when env changes', async () => {
    const { rerender } = render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          targetName="dev"
          revealValue="secret123"
          hasValue={true}
          onReveal={() => {}}
          onCopy={() => {}}
          onUpdateValue={() => {}}
        />
      </I18nProvider>
    )

    expect(screen.getByTestId('secret-reveal-toggle').getAttribute('aria-label')).toBe('Hide secret')

    const env2 = { ...env, id: '2', name: 'NEW_KEY' }
    rerender(
      <I18nProvider>
        <SecretsDetail
          env={env2}
          targetName="dev"
          revealValue=""
          hasValue={true}
          onReveal={() => {}}
          onCopy={() => {}}
          onUpdateValue={() => {}}
        />
      </I18nProvider>
    )

    expect(screen.getByTestId('secret-reveal-toggle').getAttribute('aria-label')).toBe('Reveal secret')
  })

  it('returns to dots when revealed value is cleared for same env', () => {
    const { rerender } = render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          targetName="dev"
          revealValue="secret123"
          hasValue={true}
          onReveal={() => {}}
          onCopy={() => {}}
          onUpdateValue={() => {}}
        />
      </I18nProvider>
    )

    rerender(
      <I18nProvider>
        <SecretsDetail
          env={env}
          targetName="dev"
          revealValue=""
          hasValue={true}
          onReveal={() => {}}
          onCopy={() => {}}
          onUpdateValue={() => {}}
        />
      </I18nProvider>
    )

    const input = screen.getByTestId('secret-reveal-toggle')
      .closest('div')!
      .parentElement!
      .querySelector('input')!

    expect((input as HTMLInputElement).value).toBe('••••••••')
    expect(screen.getByTestId('secret-reveal-toggle').getAttribute('aria-label')).toBe('Reveal secret')
  })

  it('hides Current Secret card and shows Define Secret when hasValue is false', () => {
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          targetName="dev"
          revealValue=""
          hasValue={false}
          onReveal={() => {}}
          onCopy={() => {}}
          onUpdateValue={() => {}}
        />
      </I18nProvider>
    )

    expect(screen.queryByText('Current Secret')).toBeNull()
    expect(screen.getByText('Define Secret')).toBeTruthy()
    expect(screen.getByText('Save')).toBeTruthy()
    expect(screen.queryByTestId('secret-copy-button')).toBeNull()
    expect(screen.queryByTestId('secret-reveal-toggle')).toBeNull()
  })
})
