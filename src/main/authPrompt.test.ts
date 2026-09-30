import { describe, expect, it, vi } from 'vitest'
import { createMacSecretAuthPrompt, isAuthCanceledError } from './authPrompt'

describe('createMacSecretAuthPrompt', () => {
  it('uses promptTouchID even when canPromptTouchID reports false', async () => {
    const promptTouchID = vi.fn().mockResolvedValue(undefined)
    const prompt = createMacSecretAuthPrompt({
      promptTouchID,
    })

    await expect(prompt('Authenticate to reveal secret')).resolves.toBeUndefined()
    expect(promptTouchID).toHaveBeenCalledTimes(1)
    expect(promptTouchID).toHaveBeenCalledWith('Authenticate to reveal secret')
  })
})

describe('isAuthCanceledError', () => {
  it('detects user cancellation messages', () => {
    expect(isAuthCanceledError(new Error('User canceled.'))).toBe(true)
    expect(isAuthCanceledError(new Error('The user cancelled the operation'))).toBe(true)
  })

  it('detects the macOS user canceled status code', () => {
    expect(isAuthCanceledError({ code: -128, message: 'failed' })).toBe(true)
  })

  it('detects cancellation on plain non Error rejections', () => {
    expect(isAuthCanceledError({ message: 'User canceled.' })).toBe(true)
  })

  it('does not treat real authentication failures as cancellation', () => {
    expect(isAuthCanceledError(new Error('Authentication failed.'))).toBe(false)
    expect(isAuthCanceledError(new Error('User is not authorized'))).toBe(false)
    expect(isAuthCanceledError(new Error('The user name or passphrase you entered is not correct.'))).toBe(false)
  })

  it('ignores values without a usable message', () => {
    expect(isAuthCanceledError('User canceled.')).toBe(false)
    expect(isAuthCanceledError(undefined)).toBe(false)
    expect(isAuthCanceledError(null)).toBe(false)
    expect(isAuthCanceledError({ message: 42 })).toBe(false)
  })
})
