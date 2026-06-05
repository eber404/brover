import type {
  EnvMetadata,
  EnvTarget,
  OnboardingStatus,
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
  listEnvs: () => Promise<EnvMetadata[]>
  createEnv: (payload: { name: string; profile: string; value: string; description?: string }) => Promise<SecretActionResult>
  revealEnv: (payload: { profile: string; name: string }) => Promise<SecretActionResult>
  copyEnv: (payload: { profile: string; name: string; isRevealed: boolean }) => Promise<SecretActionResult>
  updateEnv: (payload: { id: string; profile: string; name: string; value: string; description?: string }) => Promise<SecretActionResult>
  updateEnvConfirmed: (payload: { id: string; profile: string; name: string; value: string; description?: string }) => Promise<SecretActionResult>
  deleteEnv: (payload: { id: string; profile: string; name: string }) => Promise<SecretActionResult>
  deleteEnvConfirmed: (payload: { id: string; profile: string; name: string }) => Promise<SecretActionResult>
  toggleEnvEnabled: (id: string) => Promise<EnvMetadata[]>

  getTiedTargets: () => Promise<boolean>
  setTiedTargets: (tiedTargets: boolean) => Promise<boolean>
  pickDotfile: () => Promise<{ canceled: boolean; filePath: string | null }>
  listTargets: () => Promise<EnvTarget[]>
  createTarget: (payload: { name: string }) => Promise<EnvTarget[]>
  deleteTarget: (payload: { targetId: string }) => Promise<EnvTarget[]>
  reorderTargets: (payload: { orderedTargetIds: string[] }) => Promise<EnvTarget[]>
  renameTarget: (payload: { targetId: string; name: string }) => Promise<EnvTarget[]>
  secretExists: (profile: string, name: string) => Promise<boolean>
  setTargetColor: (payload: { targetId: string; color: string }) => Promise<EnvTarget[]>
  setActiveTarget: (payload: { targetId: string }) => Promise<EnvTarget[]>
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
