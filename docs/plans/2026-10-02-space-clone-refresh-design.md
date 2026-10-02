# Space Clone Refresh Design

## Goal

Show cloned secret metadata immediately after creating a space while `Matching Secret Names` is enabled.

## Cause

`createEnvironment()` writes cloned metadata to the store, but `AppShell.addEnvironment()` only updates its `environments` state. The renderer's `envs` state remains stale, so filtering for the new space produces an empty list until a full reload.

## Decision

After `window.brover.createEnvironment()` resolves, refresh `envs` through `window.brover.listEnvs()` before returning. Keep cloned entries value-less and `enabled: false`; neither condition suppresses a secret row.

## Verification

Add an App test that creates a space with preexisting cloned metadata and asserts the new space's secret row is rendered without a page reload. Run typecheck, lint, unit, and Electron E2E suites.
