export type RootWorkspace = 'apps' | 'secrets'

export type SpaceKind = 'dotfile'

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
  dotfilePath: string
  expanded?: boolean
  tiedSecrets: boolean
  updatedAt: string
}

export interface TerminalApp {
  id: string
  name: string
  bundlePath: string
  installed: boolean
}

export interface EnvTarget {
  id: string
  spaceId: string
  name: string
  color: string
  isActive: boolean
  updatedAt: string
}

export interface OnboardingStatus {
  completedAt?: string
}

export interface ScannedVariable {
  id: string
  name: string
  value: string
  sourceFile: string
}

export interface ScanFile {
  filePath: string
  variables: ScannedVariable[]
}

export interface ScanWarning {
  filePath: string
  line?: number
  message: string
}

export interface ScanResult {
  files: ScanFile[]
  warnings: ScanWarning[]
}

export interface RetroactiveSelection {
  selectedSensitiveIds: string[]
}

export interface OnboardingSummary {
  importedSensitive: number
  removedFromDotfiles: number
  ignoredNonSensitive: number
  ignoredWithReason: { filePath: string; reason: string }[]
}

export const UNSUPPORTED_SECRET_BACKEND = 'UNSUPPORTED_SECRET_BACKEND'
