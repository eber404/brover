# brover

[![CI](https://github.com/eber404/brover/actions/workflows/ci.yml/badge.svg)](https://github.com/eber404/brover/actions/workflows/ci.yml)

Desktop app to manage local environment variables and secrets with authentication-gated secret actions.

Stack: **Electron + React + TypeScript + TailwindCSS**.

---

## Features

- spaces + targets workflow (dev/qa/prod/custom);
- target-scoped secret values in macOS Keychain;
- auth-gated reveal/copy/update/delete for secrets;
- local JSON persistence for non-sensitive metadata only;
- apply active target to shell (`~/.zshrc`, `~/.bashrc`) or directory dotenv (`.env.<target>`).

---

## First-Run Onboarding

On first launch, brover offers two onboarding modes:

- **Acesso retroativo** — scans existing dotfiles (`.zshrc`, `.bashrc`, `.env.*`), parses env vars, and presents them grouped by file. User marks which vars are sensitive. Sensitive values are imported to Keychain and removed from dotfiles. Non-sensitive values are left in place.
- **Fresh start** — scans dotfiles to detect env names and creates spaces/targets from them, but does not import any values. User builds secret entries from scratch.

Before onboarding finishes, user also picks favorite terminal apps and their order. First favorite becomes default for `Launch`.

Onboarding runs once per user. Completion flag persisted in local config metadata.

Duplicate env names across different source files remain separate (one space per file).

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

Env name validation:

```regex
^[A-Za-z_][A-Za-z0-9_]*$
```

---

## Project structure

```txt
brover/
  src/
    main/        # Electron main process (IPC, auth gate, persistence, writers)
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

## Maintenance rule

When architecture/scope changes, update both `AGENTS.md` and `README.md` in the same change set.
