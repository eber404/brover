# AGENTS.md

## Project

**brover**

Native macOS desktop app, built with **SwiftUI + AppKit**, to manage local environment variables with secure storage in **macOS Keychain**.

MVP is **macOS-only** and **GUI-first**. CLI comes in next roadmap step.

---

## Main goal (current phase)

Build local UI to:

- register environment variables;
- organize by profiles;
- enable/disable envs;
- store sensitive values in macOS Keychain;
- reveal/copy/edit/delete with auth gates;
- persist non-sensitive metadata locally.

---

## Security decision

### Main auth

Use **macOS Keychain** as primary auth/authz mechanism.

Do not implement custom master password in MVP.

### Operations that must require authentication

- reveal env value;
- copy value;
- edit value;
- delete env;
- change sensitive settings.

### Operations that do not need secret reveal

- list env names;
- list profiles;
- view enabled/disabled status;
- view metadata;
- search by name;
- switch active profile.

---

## Threat model

### Protected

- secrets at rest on disk;
- secrets in simple backups;
- casual editing without authentication;
- reading by apps not authorized in Keychain.

### Not protected

If secret is exported to shell/process in future CLI phase, process can read it.

Correct message:

> Secrets stay protected in Keychain until loaded at runtime.

Incorrect message:

> You can use a secret without ever being able to access it.

---

## Architecture (current phase)

```txt
Native macOS App
  ├── SwiftUI Screens
  ├── AppKit Visual Effects / Window Layer
  ├── Keychain Adapter
  ├── Profile Store
  └── App Services (validation, auth gates)

macOS Keychain
  └── sensitive values

Local config
  └── non-sensitive metadata

Future CLI (`brover`)
  └── roadmap phase for export/list/get/set/enable/disable/doctor
```

---

## Components

### Native App Services

Responsible for:

- filesystem access;
- Keychain communication;
- metadata read/write;
- auth-gated secret actions;
- validation of sensitive commands.

Keep Keychain access isolated to service layer.

### SwiftUI/AppKit UI

Responsible for:

- apps allowlist workspace;
- env list;
- visual CRUD;
- profiles;
- enabled/disabled toggles;
- visual auth state;
- onboarding.

UI talks to typed service interfaces/protocols.

### Current implementation status

- Native app scaffold exists with SwiftUI navigation and baseline screens.
- Keychain service exists in service layer using `Security.framework`.
- JSON metadata store exists for non-sensitive profile/env data.
- JSON allowlist store exists for authorized apps data.
- Auth gate abstraction exists for sensitive actions (reveal/copy/edit/delete).
- Root app wiring uses JSON store at `~/Library/Application Support/brover/config.json`.
- Root app wiring uses apps allowlist store at `~/Library/Application Support/brover/apps.json`.
- Local auth gate uses macOS authentication for sensitive operations.
- Env manager flow is connected for create/edit/reveal/delete.
- Profiles workspace supports create/rename/delete/set active.
- Secrets workspace supports copy action and auto-hide reveal timeout.
- Sidebar IA is fixed to `Apps`, `Profiles`, `Secrets/Envs`.

### Future CLI `brover` (next step)

Planned commands:

```sh
brover export --profile default
brover list --profile default
brover get NAME --profile default
brover set NAME --profile default
brover enable NAME --profile default
brover disable NAME --profile default
brover doctor
```

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

### Non-sensitive

Metadata can stay in local JSON:

```txt
~/Library/Application Support/brover/config.json
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

## MVP UX

### Minimum screens

- Onboarding;
- Apps;
- Profiles;
- Env List;
- Create/Edit Env;
- Reveal Secret;
- Settings;
- Diagnostics.

### Env List fields

- name;
- profile;
- enabled;
- description;
- updatedAt;
- Keychain item status;
- actions: reveal, copy, edit, disable, delete.

### Create/Edit fields

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

- Swift;
- SwiftUI;
- AppKit (Liquid Glass / visual effects integration);
- macOS Keychain.

### Recommended

- Swift Package Manager;
- Swift Testing/XCTest;
- Keychain Services APIs (`Security.framework`);
- strict model validation for env names and profile data.

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
- config parsing;
- enable/disable;
- profile selection;
- auth gate checks.

### Integration

- save secret in Keychain;
- retrieve secret;
- delete secret;
- persist local metadata;
- auth-gated reveal flow.

### Security

- ensure config JSON has no values;
- ensure errors do not print secret;
- ensure invalid names are rejected.

---

## MVP acceptance criteria (current phase)

- user installs app on macOS;
- creates env through UI;
- value stays in Keychain;
- user can reveal value through authentication;
- user can edit/delete env through UI;
- no secret appears in config JSON or logs.

---

## Out of scope for current phase

- Linux;
- Windows;
- shell integration install;
- CLI export pipeline;
- bash/fish;
- cloud sync;
- teams/collaboration;
- custom master password;
- mobile;
- plugins.

---

## Next roadmap step

- CLI (`brover`) with `export/list/get/set/enable/disable/doctor`;
- zsh loader generation and `.zshrc` block install/uninstall;
- safe export escaping;
- shell diagnostics;
- then bash/fish support.

---

## Documentation sync rule

When scope, architecture, or roadmap changes, update both `AGENTS.md` and `README.md` in the same change set.
