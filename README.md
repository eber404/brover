# brover

macOS desktop app that manages local environment variables through a UI, stores sensitive values in the macOS Keychain, and injects envs into `zsh` shells at runtime.

MVP: **Electron + macOS + zsh**.

---

## Problem

Managing local envs usually requires editing files like:

```txt
~/.zshrc
~/.zshenv
~/.env
.profile
```

This creates problems:

- secrets remain in plain text;
- shell files are easy to break;
- no UI exists to enable/disable envs;
- values end up in backups, history, or repositories;
- switching profiles is manual.

---

## Solution

`brover` separates responsibilities:

```txt
macOS Keychain
  └── stores sensitive values

Local config
  └── stores non-sensitive metadata

Electron App
  └── UI to create, edit, enable, and disable envs

brover CLI
  └── injects envs into the shell

~/.zshrc
  └── loads the loader
```

---

## How it works

The app installs a block in `~/.zshrc`:

```sh
# >>> brover initialize >>>
[ -f "$HOME/.config/brover/loader.zsh" ] && source "$HOME/.config/brover/loader.zsh"
# <<< brover initialize <<<
```

The loader calls the CLI:

```sh
eval "$(brover export --profile default)"
```

The CLI reads enabled envs, fetches values from the Keychain, and prints safe exports:

```sh
export OPENAI_API_KEY='...'
export DATABASE_URL='...'
```

---

## Security

The project uses **macOS Keychain** as the main auth mechanism.

No custom master password in the MVP.

### What is protected

- sensitive values at rest;
- secrets kept out of `.zshrc`;
- secrets kept out of config JSON;
- read/edit operations through app with macOS authentication;
- direct access constrained by Keychain.

### Important limit

After an env is exported into a shell, that shell/process can read it:

```sh
echo "$OPENAI_API_KEY"
```

Goal: protect secrets **before injection**, not make an exported variable invisible.

---

## MVP features

- create env;
- edit env;
- delete env;
- enable/disable env;
- reveal value with authentication;
- copy value with authentication;
- organize by profile;
- install `zsh` integration;
- remove `zsh` integration;
- diagnose setup with `brover doctor`.

---

## Platform

MVP supports only:

- macOS;
- zsh;
- Electron desktop app.

Out of initial scope:

- Linux;
- Windows;
- bash;
- fish;
- cloud sync;
- team collaboration;
- custom master password.

---

## Expected structure

```txt
brover/
  apps/
    desktop/
      src/
        main/
        renderer/
        preload/
  packages/
    cli/
    core/
    keychain/
    shell/
  AGENTS.md
  README.md
```

---

## Local config

Non-sensitive metadata lives in:

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
          "description": "OpenAI local dev key"
        }
      }
    }
  }
}
```

Real values stay in Keychain, not in this file.

---

## CLI

Planned commands:

```sh
brover export --profile default
brover list --profile default
brover get OPENAI_API_KEY --profile default
brover set OPENAI_API_KEY --profile default
brover enable OPENAI_API_KEY --profile default
brover disable OPENAI_API_KEY --profile default
brover doctor
```

---

## Security rules

- never log secrets;
- never store values in local JSON;
- never expose Node.js in renderer;
- validate all env names;
- escape all values before generating `export`;
- back up `.zshrc` before modifying;
- never overwrite full `.zshrc`;
- never duplicate integration block.

---

## Valid env name

```regex
^[A-Za-z_][A-Za-z0-9_]*$
```

Valid examples:

```txt
OPENAI_API_KEY
DATABASE_URL
AWS_PROFILE
```

Invalid examples:

```txt
1TOKEN
MY KEY
API-KEY
TOKEN=value
```

---

## Roadmap

- import/export `.env`;
- project-based profiles;
- directory auto-switch;
- direnv integration;
- bash/fish support;
- Linux support;
- high-security mode;
- 1Password/Bitwarden integration;
- optional encrypted sync.
