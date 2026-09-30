export interface EnvMetadata {
  id: string
  name: string
  profile: string
  enabled: boolean
  description?: string
  updatedAt: string
}

export interface SecretActionResult {
  ok: boolean
  value?: string
  error?: string
}

export interface TerminalApp {
  id: string
  name: string
  bundlePath: string
  installed: boolean
  iconDataUrl?: string
}

export interface Environment {
  id: string
  name: string
  color: string
  isActive: boolean
  updatedAt: string
  createdAt?: string
  isGlobal?: boolean
}

export type EnvTarget = Environment

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

export const AUTH_CANCELED = 'AUTH_CANCELED'
