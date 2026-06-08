# brover

[![CI](https://github.com/eber404/brover/actions/workflows/ci.yml/badge.svg)](https://github.com/eber404/brover/actions/workflows/ci.yml)
[![Coverage](https://github.com/eber404/brover/raw/badges/coverage-badge.svg)](https://github.com/eber404/brover/tree/badges)

Brover is desktop app for organizing local secrets securely across multiple contexts, reducing setup friction and making everyday environment management simpler.

Stack: **Electron + React + TypeScript + TailwindCSS**.

---

## Features

- spaces + targets workflow (dev/qa/prod/custom);
- target-scoped secret values in macOS Keychain;
- auth-gated reveal/copy/update/delete for secrets;
- local JSON persistence for non-sensitive metadata only;
- dotfile-backed spaces created from onboarding scan or picker;
- launch terminal sessions ephemerally from Keychain-backed target envs without editing dotfiles.

---

## First-Run Onboarding

On first launch, brover opens a multi-step onboarding flow with two modes:

- **Retroactive import**: scans top-level dotfiles in `$HOME` (for example `.zshrc`, `.bashrc`, `.env`, `.env.local`), skips non-files, oversized files, binary files, comments, blank lines, subshell expressions, and non-assignment lines, parses shell-style env assignments like `NAME=value` and `export NAME=value`, shows parsed variables grouped by source file with manual reveal/hide and manual sensitive selection, then imports selected values into Keychain and removes matching assignment lines from source dotfiles. Non-selected variables stay in place. Files with no selected secrets do not become spaces.
- **Fresh start**: scans same top-level dotfiles in `$HOME`, lets user pick which source files should become brover spaces, creates one dotfile space per selected file using file basename as space name, relies on default target created with each new space, and does not import values, rewrite source files, or scaffold env entries from discovered names.

Both modes end with terminal preferences:

- onboarding lists installed terminal apps only;
- user must pick one or more favorites and order them;
- first favorite becomes default for `Launch` and preferences are saved before onboarding completes;
- `Launch` opens an ephemeral terminal session only and does not edit dotfiles.

Outside retroactive onboarding import, brover does not rewrite dotfiles during normal terminal launch flow.

Onboarding runs once per user. Completion timestamp persists in local config metadata.

Duplicate env names across different source files remain separate because onboarding creates one space per file.

---

## Spaces and targets

- A space can contain zero or more targets.
- Targets are reorderable and deletable.
- Space deletion deletes all its targets and target-scoped secrets.

### Tied targets

Each space has a `Tied targets` toggle (`tiedSecrets`):

- **ON (default)**
  - env names are synchronized across targets in that space;
  - deleting an env name removes it from all targets in the space;
  - creating a target clones env names with empty values.
- **OFF**
  - env names are target-local;
  - deleting an env name only affects selected target;
  - new targets start empty.

Values remain target-scoped in both modes.

---

## Security model

- Secret values are never stored in plaintext JSON.
- On macOS, secrets use Keychain backend.
- On unsupported platforms, sensitive secret operations fail explicitly.
- Auth required for reveal/copy(hidden)/update/delete.
- One successful auth unlocks those sensitive actions across targets until the current in-memory auth TTL expires.

Env name validation:

```regex
^[A-Za-z_][A-Za-z0-9_]*$
```

---

## Project structure

```txt
brover/
  src/
    main/        # Electron main process (IPC, auth gate, persistence, terminal launch)
    preload/     # window.brover typed bridge
    renderer/    # React UI
    shared/      # shared models/types/contracts
  tests/
    electron/    # Playwright Electron E2E
  docs/
    plans/
  AGENTS.md
  README.md
```

---

## Run

Install:

```sh
npm install
```

Development:

```sh
npm run dev
```

Build:

```sh
npm run build
```

Package unsigned macOS DMG locally:

```sh
npm run dist:mac:x64
npm run dist:mac:arm64
```

---

## Test

Typecheck:

```sh
npm run tsc
```

Unit tests:

```sh
npm run test
```

E2E tests:

```sh
npm run test:e2e
```

E2E uses isolated temp DB paths (`BROVER_DB_PATH`) and cleans artifacts after each test.

---

## Release

- push tag in format `v*` such as `v0.1.0`;
- GitHub Actions builds one macOS `x64` DMG and one macOS `arm64` DMG on native macOS runners;
- workflow publishes both installers to GitHub Releases;
- current releases are unsigned and not notarized, so macOS may warn on first open until Apple signing is added.

---

## Maintenance rule

When architecture/scope changes, update both `AGENTS.md` and `README.md` in the same change set.
