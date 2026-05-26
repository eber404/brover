# Electron Cross-Platform Rebuild Design

## Context

Current repo ships a native macOS app built with SwiftUI + AppKit.

User wants a full Electron rebuild under `electron-app/` that preserves the current product UX shape while changing the visual language to TailwindCSS + shadcn/ui.

Target direction:

- cross-platform desktop app foundation;
- macOS must keep real Keychain-backed secret storage;
- Linux/Windows secret backend remains undecided, so sensitive flows must be blocked there for now;
- current Swift app remains in repo during migration.

---

## Decision Summary

- Create standalone `electron-app/` inside repo.
- Use `Electron + React + TypeScript + Vite + TailwindCSS + shadcn/ui`.
- Rebuild app domain and persistence in TypeScript instead of wrapping Swift code.
- Use platform-specific `SecretStore` adapters behind a Node service layer.
- On macOS, use real Keychain integration.
- On Linux/Windows, allow metadata browsing but block sensitive secret operations with a clear unsupported message.

---

## Goals

- Preserve current information architecture and workflows.
- Deliver a real Electron app, not a shell around the existing native app.
- Keep renderer isolated from filesystem and secret APIs.
- Support future Linux/Windows secret backend work without redesigning the app.

---

## Non-Goals

- Implement Linux secret service integration in this phase.
- Implement Windows Credential Manager integration in this phase.
- Remove existing Swift app in the same change set.
- Build CLI support in this phase.

---

## Recommended Architecture

### App boundary

Create a new app in `electron-app/` with its own package manifest, toolchain, and source tree.

Suggested high-level layout:

```txt
electron-app/
  package.json
  electron.vite.config.ts
  components.json
  src/
    main/
      index.ts
      ipc/
      services/
      stores/
      security/
    preload/
      index.ts
    renderer/
      src/
        app/
        components/
        features/
        hooks/
        lib/
```

### Process split

- `main`: window creation, app data paths, filesystem, secret adapters, IPC handlers.
- `preload`: narrow typed bridge only.
- `renderer`: React UI with no direct Node access.

### Domain layer

Reimplement current behavior in TypeScript service classes/modules:

- `EnvManager`
- `AppAuthorizationService`
- `ProfileStore`
- `EnvMetadataStore`
- `SecretStore`

This keeps the Electron app truly portable and avoids macOS-only dependencies leaking into app logic.

---

## UX and Visual Direction

### UX shape to preserve

Keep current core layout and behavior:

- fixed left sidebar;
- persistent search in center column;
- detail panel on right;
- workspaces `Apps` and `Secrets`;
- modal create/edit flows for secrets;
- auth-gated sensitive actions.

### Visual direction to change

Do not copy Liquid Glass.

New direction:

- dark, denser desktop UI;
- solid panels instead of translucent glass;
- stronger accents and more explicit borders;
- shadcn primitives for dialogs, inputs, dropdowns, switches, tables, toasts.

The result should feel like a deliberate desktop control plane, not a web clone of the current native visuals.

### Workspace behavior

#### Apps

- searchable center list;
- add app form in panel or modal;
- right detail pane for toggle/delete;
- same fields as current app: `displayName`, `bundleID`, `enabled`.

#### Secrets

- searchable list of metadata;
- primary CTA `Add Secret`;
- detail panel with metadata, secret status, and sensitive actions;
- creation/edit dialogs built with shadcn `Dialog`;
- profile selection/filter preserved in the flow.

---

## Data Model and Persistence

### Non-sensitive local files

Store metadata under Electron app data directory, not inside repo:

- `profiles.json`
- `apps.json`
- `envs.json`

No secret values in these files.

### Secret key format

Secret identifier remains:

```txt
profile:name
```

### Metadata shape

`EnvMetadata` keeps:

- `name`
- `profile`
- `enabled`
- `description`
- `updatedAt`

`AppAuthorization` keeps:

- `displayName`
- `bundleID`
- `enabled`
- `updatedAt`

Profiles keep:

- `name`
- `isActive`
- `updatedAt`

---

## Secret Storage Strategy

### Adapter contract

Create a `SecretStore` interface with operations like:

- `saveSecret(profile, name, value)`
- `getSecret(profile, name)`
- `deleteSecret(profile, name)`
- `isSupported()`

### macOS behavior

Use a Node-accessible Keychain adapter.

Implementation target: `keytar` first, unless blocked by environment/build issues during execution.

This preserves the product security rule that secrets stay protected in Keychain until runtime access is requested.

### Linux/Windows behavior

Return a typed unsupported error for sensitive operations:

- create secret;
- reveal secret;
- copy secret value;
- edit secret value;
- delete secret.

Metadata views may still load, but workflows that require real secret persistence must stop with a clear message that secure backend support is pending.

---

## IPC and Security Boundaries

### IPC rules

- use `contextIsolation: true`;
- keep `nodeIntegration: false`;
- expose a small typed API through `contextBridge`;
- validate payloads in `main` before passing to services.

### Renderer restrictions

Renderer never touches:

- `fs`
- OS keychain APIs
- app data paths
- raw Electron modules

### Logging rules

Never log secret values.

Allowed:

- env name
- profile
- operation
- timestamps
- sanitized errors

---

## Error Handling

### Unsupported backend

Linux/Windows sensitive calls should return a stable domain error such as:

```txt
UNSUPPORTED_SECRET_BACKEND
```

UI converts this to human text like:

> Secure secret storage is not implemented for this operating system yet.

### Validation

- env names still follow `^[A-Za-z_][A-Za-z0-9_]*$`
- bundle IDs keep reverse-DNS-like validation
- duplicate app/env/profile conflicts handled in service layer

### Auth UX

On macOS, if platform adapter can surface auth or access failure, UI should show generic failure text without leaking payload details.

---

## Testing Strategy

### Unit

- env name validator
- bundle ID validator
- profile active invariant
- JSON store parsing/writing
- `SecretStore` adapter behavior and unsupported error mapping

### Integration

- `EnvManager` create/edit/delete against JSON metadata store + mocked secret adapter
- `AppAuthorizationService` CRUD
- `ProfileStore` active profile rules

### UI smoke

- sidebar renders expected workspaces
- search updates list
- secrets modal opens and validates required fields
- unsupported sensitive actions show expected message on non-mac platforms

---

## Migration Notes

- Existing Swift app remains source of behavior parity during rebuild.
- Electron app should be built in parallel, not by incrementally embedding web UI into Swift app.
- After parity reaches acceptable level, repo can decide whether to deprecate native target in a later change.

---

## Risks

- `keytar` or equivalent native module may add install/build friction.
- Reimplementing domain logic in TypeScript can drift from Swift behavior if tests are weak.
- Linux/Windows unsupported secret backend means app is functionally partial outside macOS in first release.

---

## Chosen Direction

Build a standalone Electron app in `electron-app/`, reimplement current app behavior in TypeScript services, preserve UX structure, replace visual language with TailwindCSS + shadcn/ui, use macOS Keychain in production on macOS, and explicitly block unsupported secret flows on Linux/Windows until secure backends are chosen.
