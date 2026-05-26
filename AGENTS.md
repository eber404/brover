# AGENTS.md

## Project

**brover**

Desktop app for macOS, built with **Electron**, to manage local environment variables with secure storage in **macOS Keychain** and controlled injection into shells like `zsh`.

The MVP is **macOS-only**.

---

## Main goal

Create a local UI to:

- register environment variables;
- organize by profiles;
- enable/disable envs;
- store sensitive values in macOS Keychain;
- generate integration with `~/.zshrc`;
- inject envs at runtime via authorized CLI.

---

## Security decision

### Main auth

Use **macOS Keychain** as the primary authentication/authorization mechanism.

Do not implement a custom master password in the MVP.

### Operations that must require authentication

- reveal env value;
- copy value;
- edit value;
- delete env;
- export envs to shell, if user enables secure mode;
- change sensitive settings.

### Operations that do not need to reveal secrets

- list env names;
- list profiles;
- view enabled/disabled status;
- view metadata;
- search by name;
- switch active profile, as long as values are not exported immediately.

---

## Threat model

### Protected

- secrets at rest on disk;
- secrets in simple backups;
- secrets exposed in `.zshrc`, `.zshenv`, `.bashrc`, `.profile`;
- casual editing without authentication;
- reading by apps not authorized in Keychain.

### Not protected

Do not promise that a user can use an env without being able to see it.

After an env is exported to a shell/process, that process can read it:

```sh
echo "$OPENAI_API_KEY"
env | grep OPENAI
```

Correct product message:

> Secrets stay protected in Keychain until loaded at runtime.

Incorrect message:

> You can use a secret without ever being able to access it.

---

## Architecture

```txt
Electron App
  ├── Renderer UI
  ├── Main Process
  ├── Keychain Adapter
  ├── Profile Store
  └── Installer / Shell Integration

CLI: brover
  ├── export
  ├── list
  ├── get
  ├── set
  ├── enable
  ├── disable
  └── doctor

macOS Keychain
  └── sensitive values

Local config
  └── non-sensitive metadata

~/.zshrc
  └── source ~/.config/brover/loader.zsh

loader.zsh
  └── eval "$(brover export --profile default)"
```

---

## Components

### Electron Main Process

Responsible for:

- filesystem access;
- Keychain communication;
- loader install/removal;
- secure CLI spawn;
- IPC with renderer;
- validation of sensitive commands.

Never expose direct Keychain access in renderer.

### Renderer

Responsible for:

- env list;
- visual CRUD;
- profiles;
- enabled/disabled toggles;
- shell integration install screen;
- visual auth state;
- onboarding.

Renderer must talk to Main Process through typed IPC.

### CLI `brover`

Used by shell and optionally by UI.

Minimum commands:

```sh
brover export --profile default
brover list --profile default
brover get NAME --profile default
brover set NAME --profile default
brover enable NAME --profile default
brover disable NAME --profile default
brover doctor
```

Most important command:

```sh
brover export --profile default
```

It must print only safe exports:

```sh
export OPENAI_API_KEY='escaped_value'
export DATABASE_URL='escaped_value'
```

---

## Shell integration

### Loader file

Recommended location:

```txt
~/.config/brover/loader.zsh
```

Conceptual content:

```sh
# brover loader
if command -v brover >/dev/null 2>&1; then
  eval "$(brover export --profile default)"
fi
```

### Insert into `.zshrc`

Add delimited block:

```sh
# >>> brover initialize >>>
[ -f "$HOME/.config/brover/loader.zsh" ] && source "$HOME/.config/brover/loader.zsh"
# <<< brover initialize <<<
```

Rules:

- never overwrite full `.zshrc`;
- always create backup before changing;
- do not duplicate block;
- allow clean uninstall;
- detect missing `.zshrc` and create if needed;
- in MVP, support only `zsh`.

---

## Storage

### Sensitive

Env values stay in macOS Keychain.

Suggested service name:

```txt
com.brover.secret
```

Account format:

```txt
profile:name
```

Example:

```txt
default:OPENAI_API_KEY
work:DATABASE_URL
```

### Non-sensitive

Metadata can stay in local JSON:

```txt
~/Library/Application Support/brover/config.json
```

Example:

```json
{
  "version": 1,
  "activeProfile": "default",
  "profiles": {
    "default": {
      "envs": {
        "OPENAI_API_KEY": {
          "enabled": true,
          "description": "OpenAI local dev key",
          "createdAt": "2026-05-26T00:00:00.000Z",
          "updatedAt": "2026-05-26T00:00:00.000Z"
        }
      }
    }
  },
  "shell": {
    "zshIntegrationInstalled": true,
    "loaderPath": "~/.config/brover/loader.zsh"
  }
}
```

Never store sensitive values in this JSON.

---

## Name validation

Accept only names compatible with shell env vars:

```regex
^[A-Za-z_][A-Za-z0-9_]*$
```

Reject:

- spaces;
- `=`;
- `;`;
- `$`;
- backticks;
- pipes;
- redirections;
- empty names;
- names starting with numbers.

---

## Value escaping

CLI must escape values for shell with safe single-quote strategy.

Example:

Value:

```txt
abc'def
```

Generated export:

```sh
export NAME='abc'"'"'def'
```

Never generate exports with unsafe concatenation.

Never accept content that injects commands.

---

## MVP UX

### Minimum screens

- Onboarding;
- Shell Integration Status;
- Profiles;
- Env List;
- Create/Edit Env;
- Reveal Secret;
- Settings;
- Doctor / Diagnostics.

### Env List

Fields:

- name;
- profile;
- enabled;
- description;
- updatedAt;
- Keychain item status;
- actions: reveal, copy, edit, disable, delete.

### Create/Edit

Fields:

- name;
- value;
- enabled;
- profile;
- optional description.

Editing value must require authentication.

### Reveal

- hidden by default;
- "Reveal" button;
- auth through Keychain/macOS;
- auto-hide after timeout.

---

## Technologies

### Required in MVP

- Electron;
- TypeScript;
- macOS Keychain;
- zsh integration.

### Recommended

- Electron Forge or electron-builder;
- React;
- Vite;
- Zustand or TanStack Query;
- Zod for validation;
- Vitest;
- Playwright for e2e;
- keytar or custom native Keychain bridge.

### Note on `keytar`

`keytar` can be used in MVP if compatible with current Electron version.

If it causes native build issues, replace with native wrapper/CLI using macOS APIs or `security` command.

---

## IPC

Define explicit API, without exposing Node in renderer.

Example:

```ts
window.shEnvs = {
  listProfiles(): Promise<Profile[]>;
  listEnvs(profile: string): Promise<EnvMetadata[]>;
  createEnv(input: CreateEnvInput): Promise<void>;
  updateEnv(input: UpdateEnvInput): Promise<void>;
  deleteEnv(profile: string, name: string): Promise<void>;
  revealEnv(profile: string, name: string): Promise<string>;
  installZshIntegration(): Promise<void>;
  uninstallZshIntegration(): Promise<void>;
  runDoctor(): Promise<DoctorResult>;
};
```

Rules:

- `contextIsolation: true`;
- `nodeIntegration: false`;
- preload with limited API;
- validate input in main process;
- never pass arbitrary objects to shell.

---

## CLI

### `export`

```sh
brover export --profile default
```

Behavior:

- read local metadata;
- filter enabled envs;
- fetch values from Keychain;
- generate `export` lines;
- do not print logs to stdout;
- send errors to stderr;
- non-zero exit code on fatal error.

### `doctor`

Checks:

- macOS;
- zsh;
- loader exists;
- block in `.zshrc`;
- CLI in PATH;
- valid config JSON;
- accessible Keychain items;
- permissions.

---

## Installation

MVP must offer:

- `.dmg` app;
- CLI binary installed in detectable location;
- guided `.zshrc` setup;
- automatic `.zshrc` backup.

Possible CLI locations:

```txt
/usr/local/bin/brover
/opt/homebrew/bin/brover
~/.local/bin/brover
```

Prefer no-sudo option in MVP:

```txt
~/.local/bin/brover
```

App must warn if directory is not in PATH.

---

## Logs

Never log secret values.

Allowed to log:

- env name;
- profile;
- operation;
- timestamps;
- error without sensitive payload;
- integration status.

---

## Required tests

### Unit

- name validation;
- shell escaping;
- config parsing;
- enable/disable;
- profile selection.

### Integration

- save secret in Keychain;
- retrieve secret;
- delete secret;
- export envs;
- install loader;
- remove loader.

### Security

- ensure config JSON has no values;
- ensure `export` stdout contains only exports;
- ensure errors do not print secret;
- ensure invalid names are rejected.

---

## MVP acceptance criteria

- user installs app on macOS;
- creates env through UI;
- value stays in Keychain;
- `.zshrc` receives safe block;
- new terminal loads enabled env;
- disabled env is not exported;
- user can reveal value through authentication;
- user can edit/delete env through UI;
- `brover doctor` diagnoses basic issues;
- no secret appears in config JSON or logs.

---

## Out of scope for MVP

- Linux;
- Windows;
- bash/fish;
- cloud sync;
- teams/collaboration;
- custom master password;
- mobile;
- plugins;
- aggressive automatic `.zshrc` import;
- automatic edits to `.bashrc`, `.profile`, `.zprofile`;
- promises of "invisible secret after export".

---

## Post-MVP roadmap

- bash/fish support;
- `.env` import/export;
- profile per directory/project;
- folder-based auto-switch;
- direnv integration;
- 1Password/Bitwarden integration;
- high-security mode with auth on every export;
- session expiration;
- stack-based templates;
- local audit;
- optional encrypted sync.
