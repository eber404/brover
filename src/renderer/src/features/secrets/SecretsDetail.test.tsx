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

  it('shows editable current secret field with copy button instead of eye', () => {
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          environmentName="dev"
          revealValue="secret123"
          hasValue={true}
          onCopy={() => {}}
          onUpdateValue={() => {}}
          onDelete={() => {}}
          canDelete={true}
        />
      </I18nProvider>
    )

    const input = screen.getByTestId('secret-current-input')
    expect(input).not.toBeNull()
    expect(input).not.toHaveProperty('readonly', true)
    expect((input as HTMLInputElement).value).toBe('secret123')

    expect(screen.getByTestId('secret-copy-button')).toBeTruthy()
    expect(screen.queryByTestId('secret-reveal-toggle')).toBeNull()
  })

  it('shows masked value while reveal is pending', () => {
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          environmentName="dev"
          revealValue=""
          hasValue={true}
          onCopy={() => {}}
          onUpdateValue={() => {}}
          onDelete={() => {}}
          canDelete={true}
        />
      </I18nProvider>
    )

    const input = screen.getByTestId('secret-current-input')
    expect((input as HTMLInputElement).value).toBe('••••••••')
  })

  it('enables update button when value differs from current secret', async () => {
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          environmentName="dev"
          revealValue="secret123"
          hasValue={true}
          onCopy={() => {}}
          onUpdateValue={() => {}}
          onDelete={() => {}}
          canDelete={true}
        />
      </I18nProvider>
    )

    const updateButton = screen.getByTestId('secret-update-button') as HTMLButtonElement
    expect(updateButton.disabled).toBe(true)

    fireEvent.change(screen.getByTestId('secret-current-input'), { target: { value: 'new-secret' } })
    expect(updateButton.disabled).toBe(false)
  })

  it('keeps update button disabled when value matches current secret', async () => {
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          environmentName="dev"
          revealValue="secret123"
          hasValue={true}
          onCopy={() => {}}
          onUpdateValue={() => {}}
          onDelete={() => {}}
          canDelete={true}
        />
      </I18nProvider>
    )

    const updateButton = screen.getByTestId('secret-update-button') as HTMLButtonElement
    expect(updateButton.disabled).toBe(true)

    fireEvent.change(screen.getByTestId('secret-current-input'), { target: { value: 'secret123' } })
    expect(updateButton.disabled).toBe(true)
  })

  it('calls onUpdateValue with new value when update button clicked', async () => {
    const onUpdateValue = vi.fn().mockResolvedValue(undefined)
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          environmentName="dev"
          revealValue="secret123"
          hasValue={true}
          onCopy={() => {}}
          onUpdateValue={onUpdateValue}
          onDelete={() => {}}
          canDelete={true}
        />
      </I18nProvider>
    )

    fireEvent.change(screen.getByTestId('secret-current-input'), { target: { value: 'updated-secret' } })
    fireEvent.click(screen.getByTestId('secret-update-button'))

    await waitFor(() => {
      expect(onUpdateValue).toHaveBeenCalledWith('updated-secret')
    })
  })

  it('shows delete button when canDelete is true', () => {
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          environmentName="dev"
          revealValue="secret123"
          hasValue={true}
          onCopy={() => {}}
          onUpdateValue={() => {}}
          onDelete={() => {}}
          canDelete={true}
        />
      </I18nProvider>
    )

    expect(screen.getByTestId('secret-delete-button')).toBeTruthy()
  })

  it('calls onCopy when copy button clicked', async () => {
    const onCopy = vi.fn()
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          environmentName="dev"
          revealValue="secret123"
          hasValue={true}
          onCopy={onCopy}
          onUpdateValue={() => {}}
          onDelete={() => {}}
          canDelete={true}
        />
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('secret-copy-button'))
    expect(onCopy).toHaveBeenCalledWith(true)
  })

  it('shows Define Secret section when hasValue is false', () => {
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          environmentName="dev"
          revealValue=""
          hasValue={false}
          onCopy={() => {}}
          onUpdateValue={() => {}}
          onDelete={() => {}}
          canDelete={true}
        />
      </I18nProvider>
    )

    expect(screen.queryByText('Current Secret')).toBeNull()
    expect(screen.getByText('Define Secret')).toBeTruthy()
    expect(screen.getByTestId('secret-update-button')).toBeTruthy()
    expect(screen.queryByTestId('secret-copy-button')).toBeNull()
  })

  it('labels the save action as Save when the secret has no value', () => {
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          environmentName="dev"
          revealValue=""
          hasValue={false}
          onCopy={() => {}}
          onUpdateValue={() => {}}
          onDelete={() => {}}
          canDelete={true}
        />
      </I18nProvider>
    )

    expect(screen.getByTestId('secret-update-button').textContent).toContain('Save')
    expect(screen.getByTestId('secret-update-button').textContent).not.toContain('Rotate')
  })

  it('labels the update action as Rotate when changing an existing value', () => {
    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          environmentName="dev"
          revealValue="secret123"
          hasValue={true}
          onCopy={() => {}}
          onUpdateValue={() => {}}
          onDelete={() => {}}
          canDelete={true}
        />
      </I18nProvider>
    )

    expect(screen.getByTestId('secret-update-button').textContent).toContain('Rotate')
    expect(screen.getByTestId('secret-update-button').textContent).not.toContain('Save')
  })

  it('copies the secret name from the header without touching the value copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const onCopy = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(
      <I18nProvider>
        <SecretsDetail
          env={env}
          environmentName="dev"
          revealValue="secret123"
          hasValue={true}
          onCopy={onCopy}
          onUpdateValue={() => {}}
          onDelete={() => {}}
          canDelete={true}
        />
      </I18nProvider>
    )

    const nameCopyButton = screen.getByTestId('secret-copy-name-button')
    expect(nameCopyButton.getAttribute('aria-label')).toBe('Copy variable name: OPENAI_API_KEY')

    fireEvent.click(nameCopyButton)

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('OPENAI_API_KEY')
    })
    expect(onCopy).not.toHaveBeenCalled()
  })
})