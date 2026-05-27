// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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
          enabled
          revealValue=""
          onReveal={() => {}}
          onCopy={onCopy}
          onToggleEnabled={() => {}}
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
          enabled
          revealValue=""
          onReveal={() => {}}
          onCopy={() => {}}
          onToggleEnabled={() => {}}
          onUpdateValue={() => {}}
        />
      </I18nProvider>
    )

    const updateButton = screen.getByRole('button', { name: /^update secret value$/i })
    expect(updateButton.getAttribute('disabled')).not.toBeNull()

    fireEvent.change(screen.getByPlaceholderText('Secret value'), { target: { value: 'x' } })
    expect(updateButton.getAttribute('disabled')).toBeNull()
  })
})
