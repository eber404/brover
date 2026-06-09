import type {
  EnvMetadata,
  Environment,
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

  getSharedSecretNames: () => Promise<boolean>
  setSharedSecretNames: (sharedSecretNames: boolean) => Promise<boolean>
  listEnvironments: () => Promise<Environment[]>
  createEnvironment: (payload: { name: string }) => Promise<Environment[]>
  deleteEnvironment: (payload: { environmentId: string }) => Promise<Environment[]>
  reorderEnvironments: (payload: { orderedEnvironmentIds: string[] }) => Promise<Environment[]>
  renameEnvironment: (payload: { environmentId: string; name: string }) => Promise<Environment[]>
  secretExists: (profile: string, name: string) => Promise<boolean>
  setEnvironmentColor: (payload: { environmentId: string; color: string }) => Promise<Environment[]>
  setActiveEnvironment: (payload: { environmentId: string }) => Promise<Environment[]>
  launch: {
    terminal: (environmentId: string, terminalApp: string) => Promise<{ success: boolean }>
    listTerminals: () => Promise<{ terminals: TerminalApp[] }>
    pickTerminalApp: () => Promise<{ canceled: boolean; terminal?: TerminalApp; error?: string; appName?: string }>
  }

  onboarding: {
    getStatus: () => Promise<OnboardingStatus>
    scanDotfiles: () => Promise<ScanResult>
    runRetroactive: (payload: RetroactivePayload) => Promise<OnboardingSummary>
    runFreshStart: (payload: { scanResult: ScanResult }) => Promise<OnboardingSummary>
    complete: () => Promise<void>
  }
}
