export type RootWorkspace = 'apps' | 'secrets'

export interface AppAuthorization {
  id: string
  displayName: string
  bundleID: string
  enabled: boolean
  updatedAt: string
}

export interface EnvMetadata {
  id: string
  name: string
  profile: string
  enabled: boolean
  description?: string
  updatedAt: string
}

export interface Profile {
  id: string
  name: string
  isActive: boolean
  updatedAt: string
}

export interface SecretActionResult {
  ok: boolean
  value?: string
  error?: string
}

export const UNSUPPORTED_SECRET_BACKEND = 'UNSUPPORTED_SECRET_BACKEND'
