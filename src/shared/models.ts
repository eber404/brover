export type RootWorkspace = 'apps' | 'secrets'

export type SpaceKind = 'global' | 'directory'

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
  expiresAt?: number | null
}

export interface EnvSpace {
  id: string
  name: string
  kind: SpaceKind
  path?: string
  expanded?: boolean
  tiedSecrets: boolean
  updatedAt: string
}

export interface EnvTarget {
  id: string
  spaceId: string
  name: string
  color: string
  isActive: boolean
  updatedAt: string
}

export const UNSUPPORTED_SECRET_BACKEND = 'UNSUPPORTED_SECRET_BACKEND'
