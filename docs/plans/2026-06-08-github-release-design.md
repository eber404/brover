# GitHub Release Design

## Summary

Brover needs a first public release flow that builds signed-off app artifacts for both supported macOS CPU families without requiring manual packaging on a developer machine.

For the first pass, release creation should stay intentionally small:

- trigger on Git tag pushes matching `v*`;
- build one macOS `x64` installer and one macOS `arm64` installer on native GitHub-hosted macOS runners;
- publish both artifacts to a GitHub Release;
- skip Apple code signing and notarization for now.

## Goals

- produce downloadable installers for Intel and Apple Silicon Macs;
- keep the release trigger simple and explicit with semantic tags;
- keep local developer workflow unchanged outside new release scripts;
- avoid adding release steps that require Apple Developer credentials yet.

## Non-Goals

- Apple signing, notarization, or Gatekeeper-friendly distribution;
- Windows or Linux packaging;
- auto-publishing on every push to `main`;
- Homebrew, Sparkle, or auto-update infrastructure.

## Approach Options

### Option 1: `electron-builder` with one GitHub Actions workflow

Use `electron-builder` directly from repo scripts and add a release workflow triggered by Git tags.

Pros:

- smallest change set;
- standard Electron packaging tool;
- easy per-arch matrix on native macOS runners;
- GitHub Release publishing is straightforward.

Cons:

- unsigned builds will show macOS trust warnings;
- no delta updates or auto-update feed.

### Option 2: Electron Forge packaging + publishers

Adopt Electron Forge and its GitHub publisher flow.

Pros:

- integrated packaging and publishing story;
- good long-term plugin ecosystem.

Cons:

- larger migration from current build setup;
- unnecessary tool churn for first release.

### Option 3: Manual local packaging + upload

Build `.dmg` files locally and upload them by hand to a GitHub Release.

Pros:

- no workflow authoring required.

Cons:

- not reproducible;
- easy to forget steps;
- depends on one machine.

## Recommendation

Use Option 1.

It fits current repo shape, keeps packaging isolated from renderer/main build scripts, and creates a repeatable release path with minimal new surface area.

## Packaging Design

- Add `electron-builder` as a dev dependency.
- Keep current `build` script as the shared compile step for renderer and Electron processes.
- Add release-oriented scripts for `dist` and per-arch local smoke packaging.
- Store installer output in `release/` so packaging artifacts do not collide with Vite renderer output in `dist/`.
- Generate two DMGs with stable names: `Brover-<version>-arm64.dmg` and `Brover-<version>-x64.dmg`.

## Workflow Design

- New workflow `release.yml`.
- Trigger: `push.tags: ["v*"]`.
- Matrix:
  - `macos-13` for `x64`;
  - `macos-14` for `arm64`.
- Each matrix leg should:
  - checkout repo;
  - setup Node 24;
  - setup Bun;
  - install dependencies;
  - run `bun run tsc`;
  - run `bun run test`;
  - build DMG for its target arch.
- Final job downloads both artifacts and publishes a GitHub Release for the tag.

## Unsigned Build Behavior

This first release should explicitly disable certificate auto-discovery during CI packaging so builds do not fail while Apple credentials are absent.

Expected user-facing consequence:

- app downloads work;
- macOS may warn on first open;
- public distribution polish waits for later signing/notarization change set.

## Documentation

README should gain a short Release section covering:

- required tag format;
- release workflow behavior;
- current unsigned limitation.
