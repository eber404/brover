import { describe, expect, it, vi } from 'vitest'
import { createMacSecretAuthPrompt } from './authPrompt'

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
