# Code Context Summary

Generated: 2026-09-30T20:42:17.796Z
Files: 46

## `playwright.config.ts`

Imports: `@playwright/test`

Exports: `default` (CallExpression)

## `src/main/authPrompt.ts`

Exports: `createMacSecretAuthPrompt` (FunctionDeclaration), `isAuthCanceledError` (FunctionDeclaration)

Functions:
- `createMacSecretAuthPrompt(systemPreferences: MacSystemPreferences): (reason: string) => Promise<void>`
- `isAuthCanceledError(error: unknown): boolean`
- `readCode(error: unknown): unknown`
- `readMessage(error: unknown): string`

## `src/main/authSessionCache.ts`

Exports: `AuthSessionCache` (InterfaceDeclaration), `createAuthSessionCache` (FunctionDeclaration)

Functions:
- `createAuthSessionCache(): AuthSessionCache`

Types:
- `AuthSessionCache` (interface)

## `src/main/devSession.ts`

Exports: `getDevStorageClearOptions` (FunctionDeclaration)

Functions:
- `getDevStorageClearOptions(): { storages: ClearStorageKind[]; }`

## `src/main/envMutationFlow.ts`

Imports: `../shared/models`

Exports: `runDeleteMutation` (FunctionDeclaration), `runUpdateMutation` (FunctionDeclaration)

Functions:
- `ok(value: string): SecretActionResult`
- `async runDeleteMutation(deps: DeleteMutationDeps): Promise<SecretActionResult>`
- `async runUpdateMutation(deps: UpdateMutationDeps): Promise<SecretActionResult>`

## `src/main/index.ts`

Imports: `electron`, `node:path`, `node:fs`, `./store`, `../shared/models`, `./onboardingScanner`, `./onboardingImporter`, `./secretAuthGate`, `./authSessionCache`, `./authPrompt`, `./terminalLauncher`, `./envMutationFlow`, `./terminalIconLoader`, `./devSession`, `./secretStoreFactory`

Exports: `bootstrap` (FunctionDeclaration)

Functions:
- `async bootstrap(): Promise<void>`
- `failure(error: unknown): SecretActionResult`
- `ok(value: string): SecretActionResult`

## `src/main/main.ts`

Imports: `./index`

## `src/main/onboardingImporter.ts`

Imports: `node:fs/promises`, `node:path`, `node:crypto`, `../shared/models`, `./store`

Exports: `runFreshStartImport` (FunctionDeclaration), `runRetroactiveImport` (FunctionDeclaration)

Functions:
- `async createEnvironmentForFile(store: BroverStore, filePath: string): Promise<string>`
- `async runFreshStartImport(store: BroverStore, _scanResult: ScanResult): Promise<OnboardingSummary>`
- `async runRetroactiveImport(store: BroverStore, scanResult: ScanResult, selection: RetroactiveSelection): Promise<OnboardingSummary>`

## `src/main/onboardingScanner.ts`

Imports: `node:fs/promises`, `node:path`, `node:crypto`, `../shared/models`

Exports: `scanDotfiles` (FunctionDeclaration)

Functions:
- `parseLine(line: string, lineNumber: number, filePath: string, warnings: ScanWarning[]): ScannedVariable | null`
- `async scanDotfiles(homeDir: string): Promise<ScanResult>`

## `src/main/secretAuthGate.ts`

Imports: `./authSessionCache`

Exports: `AuthPrompt` (TypeAliasDeclaration), `createSecretAuthGate` (FunctionDeclaration), `SecretAction` (TypeAliasDeclaration), `SecretActionContext` (InterfaceDeclaration)

Functions:
- `createSecretAuthGate(prompt: AuthPrompt, cache: AuthSessionCache): { authorize(action: SecretAction, context?: SecretActionContext): Promise<void>; }`

Types:
- `SecretActionContext` (interface)
- `SecretAction` (typeAlias)
- `AuthPrompt` (typeAlias)

## `src/main/secretStoreFactory.ts`

Imports: `./store`

Exports: `createSecretStore` (FunctionDeclaration)

Functions:
- `createSecretStore({
  platform,
  isE2E,
  isDev,
}: { platform: NodeJS.Platform isE2E: boolean isDev: boolean }): SecretStore`

## `src/main/store.ts`

Imports: `node:fs/promises`, `node:path`, `node:crypto`, `../shared/models`, `../shared/validators`

Exports: `BroverStore` (ClassDeclaration), `MacOSKeytarSecretStore` (ClassDeclaration), `MemorySecretStore` (ClassDeclaration), `SecretStore` (InterfaceDeclaration), `UnsupportedSecretStore` (ClassDeclaration)

Functions:
- `legacyCreatedAtFor(index: number): string`
- `randomEnvironmentColor(): string`

Types:
- `SecretStore` (interface)

Classes:
- `UnsupportedSecretStore`: async save(): Promise<void>; async get(): Promise<string | null>; async delete(): Promise<void>; async exists(): Promise<boolean>
- `MemorySecretStore`: async save(account: string, value: string): Promise<void>; async get(account: string): Promise<string | null>; async delete(account: string): Promise<void>; async exists(account: string): Promise<boolean>
- `MacOSKeytarSecretStore`: async save(account: string, value: string): Promise<void>; async get(account: string): Promise<string | null>; async delete(account: string): Promise<void>; async exists(account: string): Promise<boolean>
- `BroverStore`: async getOnboardingStatus(): Promise<OnboardingStatus>; async markOnboardingComplete(): Promise<void>; async listEnvs(): Promise<EnvMetadata[]>; async createEnv(payload: { name: string; profile: string; value: string; description?: string }): Promise<void>; async revealEnv(profile: string, name: string): Promise<string | null>; async secretExists(profile: string, name: string): Promise<boolean>; async updateEnv(payload: { id: string; profile: string; name: string; value: string; description?: string }): Promise<void>; async deleteEnv(payload: { id: string; profile: string; name: string }): Promise<void>; async toggleEnvEnabled(id: string): Promise<EnvMetadata[]>; async getSharedSecretNames(): Promise<boolean>; async setSharedSecretNames(sharedSecretNames: boolean): Promise<boolean>; async listEnvironments(): Promise<Environment[]>; async createEnvironment(payload: { name: string }): Promise<Environment[]>; async deleteEnvironment(payload: { environmentId: string }): Promise<Environment[]>; async reorderEnvironments(payload: { orderedEnvironmentIds: string[] }): Promise<Environment[]>; async renameEnvironment(payload: { environmentId: string; name: string }): Promise<Environment[]>; async setEnvironmentColor(payload: { environmentId: string; color: string }): Promise<Environment[]>; async setActiveEnvironment(payload: { environmentId: string }): Promise<Environment[]>

## `src/main/terminalIconLoader.ts`

Imports: `node:util`, `node:child_process`, `node:fs`, `node:os`, `node:path`, `electron`

Exports: `loadTerminalIconDataUrl` (FunctionDeclaration)

Functions:
- `async convertIcnsToPng(iconPath: string): Promise<string | null>`
- `async createDefaultDeps(): Promise<TerminalIconLoaderDeps>`
- `async loadTerminalIconDataUrl(bundlePath: string, deps: TerminalIconLoaderDeps): Promise<string | undefined>`
- `normalizeIconFileName(iconFileName: string): string`
- `async readBundleIconFileName(bundlePath: string): Promise<string | null>`

## `src/main/terminalLauncher.ts`

Imports: `child_process`, `fs`, `os`, `path`

Exports: `createTerminalLauncher` (FunctionDeclaration), `EnvEntry` (InterfaceDeclaration), `TerminalApp` (InterfaceDeclaration)

Functions:
- `createTerminalLauncher(deps: TerminalLauncherDeps): { listTerminals: () => TerminalApp[]; launch: (targetId: string, terminalAppId: string, entries: EnvEntry[]) => Promise<{ success: boolean; commandPath?: str...`

Types:
- `EnvEntry` (interface)
- `TerminalApp` (interface)

## `src/preload/index.ts`

Imports: `electron`, `../shared/ipc`

## `src/preload/preload.ts`

Imports: `./index`

## `src/renderer/main.tsx`

Imports: `react`, `react-dom/client`, `./src/App`, `./src/styles.css`

Classes:
- `ErrorBoundary`: getDerivedStateFromError(error: Error): { hasError: boolean; error: string; }; componentDidCatch(error: Error, info: React.ErrorInfo): void; render(): string | number | bigint | boolean | import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element | Iterable<React.ReactNode> | Promise...

## `src/renderer/src/App.tsx`

Imports: `react`, `lucide-react`, `../../shared/models`, `./components/ui/confirmDialog`, `./components/ui/dialog`, `./components/ui/toaster`, `./components/HideSplash`, `./i18n`, `./features/onboarding/OnboardingFlow`, `./features/secrets/SecretsPanel`, `./features/environments/EnvironmentsSidebar`, `./features/secrets/SecretsCenterPanel`, `./features/secrets/SecretsDetailsPanel`, `./features/terminals/TerminalSidebar`

Exports: `default` (FunctionDeclaration)

Functions:
- `App(): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element | null`
- `AppShell(): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`

React Components:
- `App` [function] props: none
- `AppShell` [function] props: none

## `src/renderer/src/components/HideSplash.tsx`

Imports: `react`

Exports: `default` (FunctionDeclaration)

Functions:
- `HideSplash({ children }: { children: React.ReactNode }): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`

React Components:
- `HideSplash` [function] props: { children }: { children: React.ReactNode }

## `src/renderer/src/components/ui/button.tsx`

Imports: `react`, `../../lib/utils`

Exports: `Button` (VariableDeclaration), `ButtonProps` (InterfaceDeclaration)

Types:
- `ButtonProps` (interface)

Exported Constants: `Button`

## `src/renderer/src/components/ui/card.tsx`

Imports: `react`, `../../lib/utils`

Exports: `Card` (FunctionDeclaration)

Functions:
- `Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`

React Components:
- `Card` [function] props: { className, ...props }: React.HTMLAttributes<HTMLDivElement>

## `src/renderer/src/components/ui/confirmDialog.tsx`

Imports: `react`, `./dialog`, `./button`

Exports: `ConfirmDialog` (FunctionDeclaration), `ConfirmDialogProps` (InterfaceDeclaration)

Functions:
- `ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`

React Components:
- `ConfirmDialog` [function] props: {
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps

Types:
- `ConfirmDialogProps` (interface)

## `src/renderer/src/components/ui/dialog.tsx`

Imports: `react`, `@radix-ui/react-dialog`, `../../lib/utils`

Exports: `Dialog` (VariableDeclaration), `DialogClose` (VariableDeclaration), `DialogContent` (FunctionDeclaration), `DialogDescription` (FunctionDeclaration), `DialogHeader` (FunctionDeclaration), `DialogTitle` (FunctionDeclaration), `DialogTrigger` (VariableDeclaration)

Functions:
- `DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`
- `DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`
- `DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`
- `DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`

React Components:
- `DialogContent` [function] props: { className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>
- `DialogDescription` [function] props: { className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>
- `DialogHeader` [function] props: { className, ...props }: React.HTMLAttributes<HTMLDivElement>
- `DialogTitle` [function] props: { className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>

Exported Constants: `Dialog`, `DialogClose`, `DialogTrigger`

## `src/renderer/src/components/ui/input.tsx`

Imports: `react`, `../../lib/utils`

Exports: `Input` (VariableDeclaration)

Exported Constants: `Input`

## `src/renderer/src/components/ui/switch.tsx`

Imports: `react`, `../../lib/utils`

Exports: `Switch` (VariableDeclaration)

Exported Constants: `Switch`

## `src/renderer/src/components/ui/toaster.tsx`

Imports: `react`, `react`

Exports: `ToastProvider` (FunctionDeclaration), `useToast` (FunctionDeclaration)

Functions:
- `Toaster(): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`
- `ToastProvider({ children }: { children: React.ReactNode }): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`
- `useToast(): ToastContextValue`

React Components:
- `Toaster` [function] props: none
- `ToastProvider` [function] props: { children }: { children: React.ReactNode }

Hooks:
- `useToast(): ToastContextValue`

## `src/renderer/src/features/environments/EnvironmentsSidebar.tsx`

Imports: `react`, `lucide-react`, `../../../../shared/models`, `../../components/ui/confirmDialog`, `../../components/ui/switch`, `../../i18n`

Exports: `EnvironmentsSidebar` (VariableDeclaration)

Exported Constants: `EnvironmentsSidebar`

## `src/renderer/src/features/launch/preferences.ts`

Exports: `getLaunchPreferences` (FunctionDeclaration), `getPreferredTerminalId` (FunctionDeclaration), `LaunchPreferences` (InterfaceDeclaration), `promoteLaunchDefault` (FunctionDeclaration), `saveLaunchPreferences` (FunctionDeclaration)

Functions:
- `dedupe(ids: string[]): string[]`
- `getLaunchPreferences(validTerminalIds: string[]): LaunchPreferences`
- `getPreferredTerminalId(validTerminalIds: string[]): string`
- `getTerminalFallback(validTerminalIds: string[]): string`
- `normalizeLaunchPreferences(value: unknown, validTerminalIds: string[]): LaunchPreferences | null`
- `promoteLaunchDefault(preferences: LaunchPreferences, terminalId: string): LaunchPreferences`
- `saveLaunchPreferences(preferences: LaunchPreferences): void`

Types:
- `LaunchPreferences` (interface)

## `src/renderer/src/features/onboarding/ConfirmationStep.tsx`

Imports: `lucide-react`, `../../i18n`, `../../components/ui/button`, `../../components/ui/card`, `../../../../shared/models`

Exports: `default` (FunctionDeclaration)

Functions:
- `ConfirmationStep({ summary, onConfirm, onBack }: ConfirmationStepProps): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`

React Components:
- `ConfirmationStep` [function] props: { summary, onConfirm, onBack }: ConfirmationStepProps

## `src/renderer/src/features/onboarding/OnboardingFlow.tsx`

Imports: `react`, `./WelcomeStep`, `./RetroactiveReviewStep`, `./ConfirmationStep`, `./TerminalPreferencesStep`, `../../../../shared/models`, `../launch/preferences`, `../launch/preferences`, `../../components/ui/card`, `../../components/ui/button`

Exports: `default` (FunctionDeclaration)

Functions:
- `computePreviewSummary(scanResult: ScanResult, selectedIds: string[]): OnboardingSummary`
- `OnboardingFlow({ onComplete }: OnboardingFlowProps): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`

React Components:
- `OnboardingFlow` [function] props: { onComplete }: OnboardingFlowProps

## `src/renderer/src/features/onboarding/RetroactiveReviewStep.tsx`

Imports: `react`, `lucide-react`, `../../i18n`, `../../components/ui/button`, `../../components/ui/card`, `../../../../shared/models`

Exports: `default` (FunctionDeclaration)

Functions:
- `fileName(filePath: string): string`
- `groupByFile(scanResult: ScanResult): FileGroup[]`
- `RetroactiveReviewStep({
  onContinue,
  onBack,
}: RetroactiveReviewStepProps): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`

React Components:
- `RetroactiveReviewStep` [function] props: {
  onContinue,
  onBack,
}: RetroactiveReviewStepProps

## `src/renderer/src/features/onboarding/TerminalPreferencesStep.tsx`

Imports: `react`, `lucide-react`, `../../i18n`, `../../components/ui/button`, `../../components/ui/card`, `../../../../shared/models`, `../launch/preferences`

Exports: `default` (FunctionDeclaration)

Functions:
- `moveItem(ids: string[], fromIndex: number, toIndex: number): string[]`
- `TerminalPreferencesStep({
  onBack,
  onContinue,
}: TerminalPreferencesStepProps): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`

React Components:
- `TerminalPreferencesStep` [function] props: {
  onBack,
  onContinue,
}: TerminalPreferencesStepProps

## `src/renderer/src/features/onboarding/WelcomeStep.tsx`

Imports: `react`, `../../i18n`, `../../components/ui/card`

Exports: `default` (FunctionDeclaration)

Functions:
- `WelcomeStep({ onSelectMode }: WelcomeStepProps): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`

React Components:
- `WelcomeStep` [function] props: { onSelectMode }: WelcomeStepProps

## `src/renderer/src/features/secrets/SecretsCenterPanel.tsx`

Imports: `react`

Exports: `SecretsCenterPanel` (VariableDeclaration)

Exported Constants: `SecretsCenterPanel`

## `src/renderer/src/features/secrets/SecretsDetail.tsx`

Imports: `react`, `../../../../shared/models`, `lucide-react`, `../../i18n`, `../../components/ui/toaster`, `../../components/ui/button`, `../../components/ui/input`

Exports: `SecretsDetail` (FunctionDeclaration)

Functions:
- `SecretsDetail({
  env,
  environmentName,
  revealValue,
  hasValue,
  onCopy,
  onUpdateValue,
  onDelete,
  canDelete
}: SecretsDetailProps): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`

React Components:
- `SecretsDetail` [function] props: {
  env,
  environmentName,
  revealValue,
  hasValue,
  onCopy,
  onUpdateValue,
  onDelete,
  canDelete
}: SecretsDetailProps

## `src/renderer/src/features/secrets/SecretsDetailsPanel.tsx`

Imports: `react`, `lucide-react`, `../../../../shared/models`, `../../components/ui/button`, `./SecretsDetail`

Exports: `SecretsDetailsPanel` (VariableDeclaration)

Exported Constants: `SecretsDetailsPanel`

## `src/renderer/src/features/secrets/SecretsPanel.tsx`

Imports: `react`, `react`, `lucide-react`, `../../../../shared/models`, `../../../../shared/models`, `../../i18n`, `../../components/ui/button`, `../../components/ui/card`, `../../components/ui/dialog`, `../../components/ui/input`, `../../components/ui/toaster`

Exports: `useSecretsPanel` (FunctionDeclaration)

Functions:
- `useSecretsPanel(props: SecretsPanelProps): { center: import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element; selectedEnv: EnvMetadata | null; hasValue: boolean; revealEnv: ...`

Hooks:
- `useSecretsPanel(props: SecretsPanelProps): { center: import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element; selectedEnv: EnvMetadata | null; hasValue: boolean; revealEnv: ...`

## `src/renderer/src/features/terminals/TerminalSidebar.tsx`

Imports: `react`, `lucide-react`, `../../../../shared/models`, `../launch/preferences`, `../../i18n`, `../../components/ui/toaster`

Exports: `TerminalSidebar` (VariableDeclaration)

Exported Constants: `TerminalSidebar`

## `src/renderer/src/i18n/index.tsx`

Imports: `react`, `react`, `./locales/en.json`, `./locales/es.json`, `./locales/pt.json`

Exports: `I18nProvider` (FunctionDeclaration), `Locale` (TypeAliasDeclaration), `useI18n` (FunctionDeclaration)

Functions:
- `getNestedValue(obj: Record<string, unknown>, path: string): string`
- `getStoredLocale(): Locale`
- `I18nProvider({ children }: { children: ReactNode }): import("/Users/eber/dev/brover/node_modules/@types/react/jsx-runtime").JSX.Element`
- `storeLocale(newLocale: Locale): void`
- `useI18n(): I18nContextValue`

React Components:
- `I18nProvider` [function] props: { children }: { children: ReactNode }

Types:
- `Locale` (typeAlias)

Hooks:
- `useI18n(): I18nContextValue`

## `src/renderer/src/lib/utils.ts`

Imports: `clsx`, `tailwind-merge`

Exports: `cn` (FunctionDeclaration)

Functions:
- `cn(inputs: ClassValue[]): string`

## `src/shared/ipc.ts`

Imports: `./models`

Exports: `BroverAPI` (InterfaceDeclaration), `RetroactivePayload` (InterfaceDeclaration)

Types:
- `RetroactivePayload` (interface)
- `BroverAPI` (interface)

## `src/shared/models.ts`

Exports: `AUTH_CANCELED` (VariableDeclaration), `Environment` (InterfaceDeclaration), `EnvMetadata` (InterfaceDeclaration), `EnvTarget` (TypeAliasDeclaration), `OnboardingStatus` (InterfaceDeclaration), `OnboardingSummary` (InterfaceDeclaration), `RetroactiveSelection` (InterfaceDeclaration), `ScanFile` (InterfaceDeclaration), `ScannedVariable` (InterfaceDeclaration), `ScanResult` (InterfaceDeclaration), `ScanWarning` (InterfaceDeclaration), `SecretActionResult` (InterfaceDeclaration), `TerminalApp` (InterfaceDeclaration), `UNSUPPORTED_SECRET_BACKEND` (VariableDeclaration)

Types:
- `EnvMetadata` (interface)
- `SecretActionResult` (interface)
- `TerminalApp` (interface)
- `Environment` (interface)
- `OnboardingStatus` (interface)
- `ScannedVariable` (interface)
- `ScanFile` (interface)
- `ScanWarning` (interface)
- `ScanResult` (interface)
- `RetroactiveSelection` (interface)
- `OnboardingSummary` (interface)
- `EnvTarget` (typeAlias)

Exported Constants: `AUTH_CANCELED`="AUTH_CANCELED", `UNSUPPORTED_SECRET_BACKEND`="UNSUPPORTED_SECRET_BACKEND"

## `src/shared/validators.ts`

Exports: `isValidEnvName` (FunctionDeclaration)

Functions:
- `isValidEnvName(value: string): boolean`

## `tailwind.config.ts`

Imports: `tailwindcss`

Exports: `default` (SatisfiesExpression)

## `vite.config.ts`

Imports: `vite`, `@vitejs/plugin-react`

Exports: `default` (CallExpression)

## `vitest.config.ts`

Imports: `vitest/config`

Exports: `default` (CallExpression)
