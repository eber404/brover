# Liquid Glass MVP UX Design

## Context

Reference image in `ref/image.png` is inspiration only.

MVP must keep only brover-required components and remove unrelated patterns from reference.

Out of scope UI elements:

- user photo;
- support button;
- login/account creation;
- password/username/notes/credit cards/favorites/logins modules;
- generic category system.

---

## UX Goals

- native macOS visual language with Liquid Glass treatment;
- low cognitive load with clear workspace separation;
- secure secret workflows with explicit auth gates;
- strict MVP scope with no extra dashboard features.

---

## Information Architecture

Primary navigation is a fixed left sidebar with exactly three entries:

1. `Apps`
2. `Profiles`
3. `Secrets/Envs`

### Apps workspace

MVP behavior: manual allowlist only.

- add app by `displayName` + `bundleId`;
- toggle app enabled/disabled;
- remove app from allowlist.

No auto-discovery of installed apps.
No runtime prompt monitor in this phase.

### Profiles workspace

- list profiles;
- create profile;
- rename profile;
- remove profile;
- set active profile (single active profile invariant).

### Secrets/Envs workspace

- filter by selected profile;
- list env metadata (`name`, `enabled`, `updatedAt`, keychain status);
- create env;
- edit env metadata;
- reveal/copy/edit value/delete actions behind auth gate.

---

## Liquid Glass Visual System

### Shell and materials

- use `NSVisualEffectView` layers for backdrop and panel surfaces;
- use translucency + subtle borders for card/panel separation;
- keep text contrast high over blur.

### Sidebar

- fixed width between 220 and 260;
- icon + text for each workspace;
- active item uses glass pill highlight.

### Top bar per workspace

- title + concise subtitle;
- right-side primary CTA (`Add App`, `New Profile`, `Add Secret`).

### Content regions

- list/table content inside glass cards;
- inline detail/edit sections where possible;
- avoid heavy modal usage unless destructive action confirmation needed.

### Motion

- short transition on workspace switch (fade + light slide, ~140-180ms);
- subtle hover/focus feedback;
- avoid decorative or noisy animations.

### Accessibility

- keyboard navigation across sidebar and lists;
- predictable tab order and action focus;
- maintain readable contrast on translucent surfaces.

---

## Data and Security Flow

### Apps allowlist data

Fields:

- `id`;
- `displayName`;
- `bundleId`;
- `enabled`;
- `updatedAt`.

Rules:

- `bundleId` required;
- reverse-DNS-like format validation;
- uniqueness per app entry.

Stored in local JSON (non-sensitive).

### Profiles data

Fields:

- `name`;
- `isActive`;
- `updatedAt`.

Rules:

- single active profile invariant;
- profile name uniqueness.

Stored in local JSON (non-sensitive).

### Secrets/env data split

- metadata in JSON;
- secret values in Keychain only (`profile:name`).

Core flows:

1. **Create env**
   - validate env name;
   - save secret in Keychain;
   - persist metadata in JSON.
2. **Edit value**
   - require auth gate;
   - update Keychain;
   - update metadata `updatedAt`.
3. **Reveal/copy/delete**
   - require auth gate every time;
   - never expose secrets in logs/errors.

---

## Error Handling and Empty States

### Error strategy

- field-level validation errors inline;
- operation failures as non-intrusive banner/toast in workspace;
- generic message for auth denial/failure;
- no secret payload in logs or UI errors.

### Empty states

Each workspace has explicit empty state and single CTA:

- Apps: `No apps authorized yet` + `Add App`;
- Profiles: `No profiles yet` + `Create Profile`;
- Secrets/Envs: `No envs in this profile` + `Add Secret`.

---

## Testing Requirements (UX-aligned)

### Unit

- env name validator;
- bundle id validator;
- active profile selection invariant;
- auth gate decision handling.

### Integration

- Keychain save/load/delete roundtrip;
- JSON persistence for apps/profiles/env metadata;
- create/edit/reveal/delete flow through env manager.

### UI smoke

- sidebar renders exactly 3 tabs;
- each workspace shows expected primary actions;
- sensitive actions blocked when auth gate denies.

---

## Non-goals (MVP)

- account system;
- support/helpdesk widgets;
- unrelated secret categories;
- runtime app request monitor;
- cross-platform desktop UI.

---

## Implementation Sequence

1. Introduce `Apps` workspace model/store/service.
2. Refactor sidebar to fixed 3-tab IA.
3. Implement Liquid Glass shell tokens/components.
4. Wire profile and env views into new workspace layout.
5. Add validation/error/empty-state polish.
6. Expand automated tests for new workspace and rules.

---

## Decision Summary

- Navigation approach: fixed sidebar with 3 workspaces.
- Apps scope: manual allowlist only in MVP.
- Security posture: auth-gated sensitive actions, Keychain-only secret values.
- Visual direction: native macOS Liquid Glass, minimal and purposeful.
