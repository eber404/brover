# brover

Native macOS app to manage local environment variables with secure secret storage in macOS Keychain.

Current phase: **SwiftUI + AppKit GUI-first MVP**, with active **Electron cross-platform rebuild** in `electron-app/`.

---

## Current status

- native project bootstrapped with Swift Package Manager;
- app target (`BroverApp`) with SwiftUI entrypoint;
- core target (`BroverCore`) for models, validation, and service contracts;
- native Keychain service implemented with `Security.framework`;
- JSON-backed profile/env metadata store implemented;
- env manager service wired to create/edit/reveal/delete flows;
- real app uses JSON config at `~/Library/Application Support/brover/config.json`;
- apps allowlist uses JSON config at `~/Library/Application Support/brover/apps.json`;
- real auth gate uses macOS local authentication (Touch ID/password);
- sidebar IA now uses `ENV SPACES` tree with default `Glob` space and nested targets;
- UI now uses 3-column shell: sidebar, searchable list, detail panel;
- search bar stays persistent in center column and filters secrets for selected target;
- each space can host multiple targets (e.g. dev/qa/uat/prod) with unique target names and target color tags;
- secret name schema is auto-synced across targets in same space; value/enable remain target-scoped;
- `Glob` space can apply active target to user shells (`~/.zshrc`, `~/.bashrc`) via managed block;
- directory spaces can apply selected target to `.env.<target>` files;
- `Secrets` workspace supports auth-gated reveal/copy/edit/delete with auto-hide reveal timeout;
- bundle ID validation added for app authorization workflow;
- tests cover validation, stores, auth gate checks, and env manager flows.

---

## Why native

brover prioritizes macOS visual fidelity and platform integration:

- SwiftUI + AppKit for native look and Liquid Glass style effects;
- direct Keychain integration through Apple frameworks;
- lower overhead than web-runtime UI stack.

---

## Architecture (current phase)

```txt
Native macOS App
  ├── SwiftUI screens
  ├── AppKit visual effect bridge
  ├── App service layer
  ├── Apps authorization service/store
  ├── Profile/env metadata store
  └── Validation and auth gates

macOS Keychain
  └── sensitive values (implemented service layer)

Local config
  ├── non-sensitive profile/env metadata (implemented JSON store)
  └── app authorization allowlist metadata (implemented JSON store)
```

---

## Repository structure

```txt
brover/
  Sources/
    BroverApp/
    BroverCore/
  Tests/
    BroverAppTests/
    BroverCoreTests/
  docs/
    plans/
  electron-app/
  AGENTS.md
  Package.swift
  README.md
```

---

## Electron rebuild (new)

- new app lives in `electron-app/`;
- stack: Electron + React + TypeScript + TailwindCSS + shadcn/ui;
- UX shape uses 3-column shell with `ENV SPACES` sidebar, secrets list, and details panel;
- non-sensitive metadata persists in local JSON under Electron app data;
- on macOS, secrets use Keychain backend;
- on Linux/Windows, sensitive secret actions are blocked with explicit unsupported message until secure backend is defined.

Run Electron app:

```sh
npm --prefix electron-app install
npm --prefix electron-app run dev
```

Build Electron app:

```sh
npm --prefix electron-app run build
```

---

## Build and test

```sh
swift build
swift test
```

Run app from package:

```sh
swift run BroverApp
```

Makefile shortcuts:

```sh
make build
make test
make run
make run-release
make open
```

Run focused test groups:

```sh
swift test --filter KeychainServiceTests
swift test --filter JSONProfileStoreTests
swift test --filter AuthGateTests
```

---

## Security model

- use macOS Keychain as primary auth/authz mechanism;
- never store secret values in local JSON;
- auth required for reveal/copy/edit/delete secret actions;
- never log secret values.

Env name validation rule:

```regex
^[A-Za-z_][A-Za-z0-9_]*$
```

---

## Roadmap

Next step after app MVP:

- implement CLI `brover` (`export/list/get/set/enable/disable/doctor`);
- add zsh loader generation and `.zshrc` block management;
- add safe export escaping and shell diagnostics;
- then expand shell support (bash/fish).

---

## Maintenance rule

When architecture/scope changes, update both `AGENTS.md` and `README.md` in same change set.
