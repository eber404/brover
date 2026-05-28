import type {
  AppAuthorization,
  EnvMetadata,
  EnvSpace,
  EnvTarget,
  OnboardingStatus,
  Profile,
  RetroactiveSelection,
  ScanResult,
  SecretActionResult,
  OnboardingSummary,
  TerminalApp,
} from './models'

export interface RetroactivePayload {
  scanResult: ScanResult
  selection: RetroactiveSelection
}

export interface BroverAPI {
  listApps: () => Promise<AppAuthorization[]>
  createApp: (payload: { displayName: string; bundleID: string }) => Promise<AppAuthorization[]>
  toggleApp: (id: string) => Promise<AppAuthorization[]>
  deleteApp: (id: string) => Promise<AppAuthorization[]>

  listProfiles: () => Promise<Profile[]>
  createProfile: (name: string) => Promise<Profile[]>
  setActiveProfile: (id: string) => Promise<Profile[]>

  listEnvs: () => Promise<EnvMetadata[]>
  createEnv: (payload: { name: string; profile: string; value: string; description?: string }) => Promise<SecretActionResult>
  revealEnv: (payload: { profile: string; name: string }) => Promise<SecretActionResult>
  copyEnv: (payload: { profile: string; name: string; isRevealed: boolean }) => Promise<SecretActionResult>
  updateEnv: (payload: { id: string; profile: string; name: string; value: string; description?: string }) => Promise<SecretActionResult>
  deleteEnv: (payload: { id: string; profile: string; name: string }) => Promise<SecretActionResult>
  deleteEnvConfirmed: (payload: { id: string; profile: string; name: string }) => Promise<SecretActionResult>
  toggleEnvEnabled: (id: string) => Promise<EnvMetadata[]>

  listSpaces: () => Promise<EnvSpace[]>
  createSpace: (payload: { name: string; dotfilePath: string }) => Promise<EnvSpace[]>
  renameSpace: (payload: { spaceId: string; name: string }) => Promise<EnvSpace[]>
  deleteSpace: (spaceId: string) => Promise<EnvSpace[]>
  toggleSpaceTiedSecrets: (spaceId: string) => Promise<EnvSpace[]>
  pickDotfile: () => Promise<{ canceled: boolean; filePath: string | null }>
  toggleSpaceExpanded: (spaceId: string) => Promise<EnvSpace[]>
  listTargets: (spaceId: string) => Promise<EnvTarget[]>
  createTarget: (payload: { spaceId: string; name: string }) => Promise<EnvTarget[]>
  deleteTarget: (payload: { targetId: string }) => Promise<EnvTarget[]>
  reorderTargets: (payload: { spaceId: string; orderedTargetIds: string[] }) => Promise<EnvTarget[]>
  renameTarget: (payload: { targetId: string; name: string }) => Promise<EnvTarget[]>
  secretExists: (profile: string, name: string) => Promise<boolean>
  setTargetColor: (payload: { targetId: string; color: string }) => Promise<EnvTarget[]>
  setActiveTarget: (payload: { spaceId: string; targetId: string }) => Promise<EnvTarget[]>
  applySpace: (spaceId: string) => Promise<{ applied: number }>

  inject: {
    activate: (targetId: string, dotfilePath: string) => Promise<{ success: boolean }>
    deactivate: (targetId: string, dotfilePath: string) => Promise<{ success: boolean }>
    status: (targetId: string) => Promise<{ active: boolean }>
    listActive: () => Promise<{ activeTargetIds: string[] }>
  }
  launch: {
    terminal: (targetId: string, terminalApp: string) => Promise<{ success: boolean }>
    listTerminals: () => Promise<{ terminals: TerminalApp[] }>
  }

  onboarding: {
    getStatus: () => Promise<OnboardingStatus>
    scanDotfiles: () => Promise<ScanResult>
    runRetroactive: (payload: RetroactivePayload) => Promise<OnboardingSummary>
    runFreshStart: (payload: { scanResult: ScanResult }) => Promise<OnboardingSummary>
    complete: () => Promise<void>
  }
}
