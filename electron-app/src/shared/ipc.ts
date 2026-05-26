import type { AppAuthorization, EnvMetadata, Profile, SecretActionResult } from './models'

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
  updateEnv: (payload: { id: string; profile: string; name: string; value: string; description?: string; enabled: boolean }) => Promise<SecretActionResult>
  deleteEnv: (payload: { id: string; profile: string; name: string }) => Promise<SecretActionResult>
  toggleEnvEnabled: (id: string) => Promise<EnvMetadata[]>
}
