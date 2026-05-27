# Code Context Summary

Generated: 2026-05-27T16:51:37.211Z
Files: 31

## `playwright.config.ts`

Imports: `@playwright/test`

Exports: `default` (CallExpression)

## `src/main/envWriters.ts`

Exports: `buildDotenvContent` (FunctionDeclaration), `buildManagedShellBlock` (FunctionDeclaration), `EnvEntry` (InterfaceDeclaration), `upsertManagedShellBlock` (FunctionDeclaration)

Functions:
- `buildDotenvContent(entries: EnvEntry[]): string`
- `buildManagedShellBlock(entries: EnvEntry[]): string`
- `escapeShellValue(value: string): string`
- `upsertManagedShellBlock(content: string, block: string): string`

Types:
- `EnvEntry` (interface)

## `src/main/index.ts`

Imports: `electron`, `node:path`, `node:fs`, `./store`, `../shared/models`, `./secretAuthGate`

Functions:
- `async bootstrap(): Promise<void>`
- `createSecretStore(): MacOSKeytarSecretStore | UnsupportedSecretStore`
- `failure(error: unknown): SecretActionResult`
- `ok(value: string): SecretActionResult`

## `src/main/main.ts`

Imports: `./index`

## `src/main/secretAuthGate.ts`

Exports: `AuthPrompt` (TypeAliasDeclaration), `createSecretAuthGate` (FunctionDeclaration), `SecretAction` (TypeAliasDeclaration), `SecretActionContext` (InterfaceDeclaration)

Functions:
- `createSecretAuthGate(prompt: AuthPrompt): { authorize(action: SecretAction, context?: SecretActionContext): Promise<void>; }`

Types:
- `SecretActionContext` (interface)
- `SecretAction` (typeAlias)
- `AuthPrompt` (typeAlias)

## `src/main/store.ts`

Imports: `node:fs/promises`, `node:path`, `node:crypto`, `../shared/models`, `../shared/validators`, `./envWriters`

Exports: `BroverStore` (ClassDeclaration), `MacOSKeytarSecretStore` (ClassDeclaration), `MemorySecretStore` (ClassDeclaration), `SecretStore` (InterfaceDeclaration), `UnsupportedSecretStore` (ClassDeclaration)

Functions:
- `createDefaultGlobalSpace(now: string): EnvSpace`
- `createDefaultGlobalTarget(now: string): EnvTarget`
- `randomTargetColor(): string`

Types:
- `SecretStore` (interface)

Classes:
- `UnsupportedSecretStore`: async save(): Promise<void>; async get(): Promise<string | null>; async delete(): Promise<void>
- `MemorySecretStore`: async save(account: string, value: string): Promise<void>; async get(account: string): Promise<string | null>; async delete(account: string): Promise<void>
- `MacOSKeytarSecretStore`: async save(account: string, value: string): Promise<void>; async get(account: string): Promise<string | null>; async delete(account: string): Promise<void>
- `BroverStore`: async listApps(): Promise<AppAuthorization[]>; async createApp(displayName: string, bundleID: string): Promise<AppAuthorization[]>; async toggleApp(id: string): Promise<AppAuthorization[]>; async deleteApp(id: string): Promise<AppAuthorization[]>; async listProfiles(): Promise<Profile[]>; async createProfile(name: string): Promise<Profile[]>; async setActiveProfile(id: string): Promise<Profile[]>; async listEnvs(): Promise<EnvMetadata[]>; async createEnv(payload: { name: string; profile: string; value: string; description?: string }): Promise<void>; async revealEnv(profile: string, name: string): Promise<string | null>; async updateEnv(payload: { id: string; profile: string; name: string; value: string; description?: string; enabled: boolean }): Promise<void>; async deleteEnv(payload: { id: string; profile: string; name: string }): Promise<void>; async toggleEnvEnabled(id: string): Promise<EnvMetadata[]>; async listSpaces(): Promise<EnvSpace[]>; async createSpace(payload: { name: string; path: string }): Promise<EnvSpace[]>; async renameSpace(payload: { spaceId: string; name: string }): Promise<EnvSpace[]>; async deleteSpace(spaceId: string): Promise<EnvSpace[]>; async toggleSpaceExpanded(spaceId: string): Promise<EnvSpace[]>; async listTargets(spaceId: string): Promise<EnvTarget[]>; async createTarget(payload: { spaceId: string; name: string }): Promise<EnvTarget[]>; async deleteTarget(payload: { targetId: string }): Promise<EnvTarget[]>; async reorderTargets(payload: { spaceId: string; orderedTargetIds: string[] }): Promise<EnvTarget[]>; async renameTarget(payload: { targetId: string; name: string }): Promise<EnvTarget[]>; async setTargetColor(payload: { targetId: string; color: string }): Promise<EnvTarget[]>; async setActiveTarget(payload: { spaceId: string; targetId: string }): Promise<EnvTarget[]>; async applyGlobalShell(): Promise<{ applied: number; }>; async applyDirectoryTarget(payload: { targetId: string }): Promise<{ applied: number; path: string; }>

## `src/preload/index.ts`

Imports: `electron`, `../shared/ipc`

## `src/preload/preload.ts`

Imports: `./index`

## `src/renderer/main.tsx`

Imports: `react`, `react-dom/client`, `./src/App`, `./src/styles.css`

Classes:
- `ErrorBoundary`: getDerivedStateFromError(error: Error): { hasError: boolean; error: string; }; componentDidCatch(error: Error, info: React.ErrorInfo): void; render(): string | number | bigint | boolean | import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element | Iterable<React.ReactNo...

## `src/renderer/src/App.tsx`

Imports: `react`, `lucide-react`, `../../shared/models`, `./components/ui/button`, `./components/ui/toaster`, `./i18n`, `./features/secrets/SecretsDetail`, `./features/secrets/SecretsPanel`, `./features/spaces/SpacesSidebar`, `./features/secrets/SecretsCenterPanel`, `./features/secrets/SecretsDetailsPanel`

Exports: `default` (FunctionDeclaration)

Functions:
- `App(): import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element`
- `AppShell(): import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element`

React Components:
- `App` [function] props: none
- `AppShell` [function] props: none

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
- `Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element`

React Components:
- `Card` [function] props: { className, ...props }: React.HTMLAttributes<HTMLDivElement>

## `src/renderer/src/components/ui/dialog.tsx`

Imports: `react`, `@radix-ui/react-dialog`, `../../lib/utils`

Exports: `Dialog` (VariableDeclaration), `DialogClose` (VariableDeclaration), `DialogContent` (FunctionDeclaration), `DialogDescription` (FunctionDeclaration), `DialogHeader` (FunctionDeclaration), `DialogTitle` (FunctionDeclaration), `DialogTrigger` (VariableDeclaration)

Functions:
- `DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>): import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element`
- `DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>): import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element`
- `DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element`
- `DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>): import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element`

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
- `Toaster(): import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element`
- `ToastProvider({ children }: { children: React.ReactNode }): import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element`
- `useToast(): ToastContextValue`

React Components:
- `Toaster` [function] props: none
- `ToastProvider` [function] props: { children }: { children: React.ReactNode }

Hooks:
- `useToast(): ToastContextValue`

## `src/renderer/src/features/apps/AppsDetail.tsx`

Imports: `lucide-react`, `../../../../shared/models`, `../../i18n`, `../../components/ui/button`, `../../components/ui/switch`

Exports: `AppsDetail` (FunctionDeclaration)

Functions:
- `AppsDetail({ app, enabled, onToggleEnabled, onDelete }: AppsDetailProps): import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element`

React Components:
- `AppsDetail` [function] props: { app, enabled, onToggleEnabled, onDelete }: AppsDetailProps

## `src/renderer/src/features/apps/AppsPanel.tsx`

Imports: `lucide-react`, `../../../../shared/models`, `../../i18n`, `../../components/ui/button`, `../../components/ui/card`, `../../components/ui/input`

Exports: `useAppsPanel` (FunctionDeclaration)

Functions:
- `useAppsPanel(props: AppsPanelProps): { center: import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element; selectedApp: AppAuthorization | null; }`

Hooks:
- `useAppsPanel(props: AppsPanelProps): { center: import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element; selectedApp: AppAuthorization | null; }`

## `src/renderer/src/features/secrets/SecretsCenterPanel.tsx`

Imports: `react`

Exports: `SecretsCenterPanel` (VariableDeclaration)

Exported Constants: `SecretsCenterPanel`

## `src/renderer/src/features/secrets/SecretsDetail.tsx`

Imports: `react`, `../../../../shared/models`, `lucide-react`, `../../i18n`, `../../components/ui/button`, `../../components/ui/input`, `../../components/ui/switch`

Exports: `SecretsDetail` (FunctionDeclaration)

Functions:
- `SecretsDetail({
  env,
  targetName,
  enabled,
  revealValue,
  onReveal,
  onCopy,
  onToggleEnabled,
  onUpdateValue
}: SecretsDetailProps): import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element`

React Components:
- `SecretsDetail` [function] props: {
  env,
  targetName,
  enabled,
  revealValue,
  onReveal,
  onCopy,
  onToggleEnabled,
  onUpdateValue
}: SecretsDetailProps

## `src/renderer/src/features/secrets/SecretsDetailsPanel.tsx`

Imports: `react`, `lucide-react`, `../../../../shared/models`, `../../components/ui/button`, `./SecretsDetail`

Exports: `SecretsDetailsPanel` (VariableDeclaration)

Exported Constants: `SecretsDetailsPanel`

## `src/renderer/src/features/secrets/SecretsPanel.tsx`

Imports: `react`, `react`, `lucide-react`, `../../../../shared/models`, `../../../../shared/models`, `../../i18n`, `../../components/ui/button`, `../../components/ui/card`, `../../components/ui/dialog`, `../../components/ui/input`, `../../components/ui/toaster`

Exports: `useSecretsPanel` (FunctionDeclaration)

Functions:
- `useSecretsPanel(props: SecretsPanelProps): { center: import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element; selectedEnv: EnvMetadata | null; revealEnv: () => ...`

Hooks:
- `useSecretsPanel(props: SecretsPanelProps): { center: import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element; selectedEnv: EnvMetadata | null; revealEnv: () => ...`

## `src/renderer/src/features/spaces/SpacesSidebar.tsx`

Imports: `react`, `lucide-react`, `../../../../shared/models`

Exports: `SpacesSidebar` (VariableDeclaration)

Exported Constants: `SpacesSidebar`

## `src/renderer/src/i18n/index.tsx`

Imports: `react`, `react`, `./locales/en.json`, `./locales/es.json`, `./locales/pt.json`

Exports: `I18nProvider` (FunctionDeclaration), `Locale` (TypeAliasDeclaration), `useI18n` (FunctionDeclaration)

Functions:
- `getNestedValue(obj: Record<string, unknown>, path: string): string`
- `getStoredLocale(): Locale`
- `I18nProvider({ children }: { children: ReactNode }): import("/Users/eber/dev/brover/electron-app/node_modules/@types/react/jsx-runtime").JSX.Element`
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

Exports: `BroverAPI` (InterfaceDeclaration)

Types:
- `BroverAPI` (interface)

## `src/shared/models.ts`

Exports: `AppAuthorization` (InterfaceDeclaration), `EnvMetadata` (InterfaceDeclaration), `EnvSpace` (InterfaceDeclaration), `EnvTarget` (InterfaceDeclaration), `Profile` (InterfaceDeclaration), `RootWorkspace` (TypeAliasDeclaration), `SecretActionResult` (InterfaceDeclaration), `SpaceKind` (TypeAliasDeclaration), `UNSUPPORTED_SECRET_BACKEND` (VariableDeclaration)

Types:
- `AppAuthorization` (interface)
- `EnvMetadata` (interface)
- `Profile` (interface)
- `SecretActionResult` (interface)
- `EnvSpace` (interface)
- `EnvTarget` (interface)
- `RootWorkspace` (typeAlias)
- `SpaceKind` (typeAlias)

Exported Constants: `UNSUPPORTED_SECRET_BACKEND`="UNSUPPORTED_SECRET_BACKEND"

## `src/shared/validators.ts`

Exports: `isValidBundleID` (FunctionDeclaration), `isValidEnvName` (FunctionDeclaration)

Functions:
- `isValidBundleID(value: string): boolean`
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
