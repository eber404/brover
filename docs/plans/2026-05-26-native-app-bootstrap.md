# Native macOS App Bootstrap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bootstrap a native macOS SwiftUI/AppKit app at repository root with initial domain/service structure for brover MVP.

**Architecture:** Use a Swift Package executable app target with SwiftUI entrypoint and lightweight AppKit bridge for visual effects. Keep business logic in service protocols and in-memory stubs first so UI can evolve without storage coupling. Add validation and model types early, then wire a basic home screen and compile-time checks.

**Tech Stack:** Swift 6, SwiftUI, AppKit, Security.framework, Swift Package Manager, XCTest/Swift Testing.

---

### Task 1: Bootstrap Swift package and app entrypoint

**Files:**
- Create: `Package.swift`
- Create: `Sources/BroverApp/BroverApp.swift`
- Create: `Sources/BroverApp/AppDelegate.swift`
- Create: `Sources/BroverApp/UI/RootView.swift`

**Step 1: Write the failing test**

Create `Tests/BroverAppTests/BroverAppTests.swift` asserting root view model bootstrap API compiles.

**Step 2: Run test to verify it fails**

Run: `swift test`
Expected: FAIL because app sources do not exist yet.

**Step 3: Write minimal implementation**

Add package manifest with macOS platform and executable target. Add `@main` SwiftUI app and root view.

**Step 4: Run test to verify it passes**

Run: `swift test`
Expected: PASS for bootstrap test.

**Step 5: Commit**

```bash
git add Package.swift Sources/BroverApp Tests/BroverAppTests
git commit -m "feat: bootstrap native brover app package"
```

### Task 2: Add domain models and env name validation

**Files:**
- Create: `Sources/BroverCore/Models/EnvMetadata.swift`
- Create: `Sources/BroverCore/Models/Profile.swift`
- Create: `Sources/BroverCore/Validation/EnvNameValidator.swift`
- Create: `Tests/BroverCoreTests/EnvNameValidatorTests.swift`

**Step 1: Write the failing test**

Add valid/invalid env-name test vectors.

**Step 2: Run test to verify it fails**

Run: `swift test --filter EnvNameValidatorTests`
Expected: FAIL because validator missing.

**Step 3: Write minimal implementation**

Implement regex validator matching `^[A-Za-z_][A-Za-z0-9_]*$`.

**Step 4: Run test to verify it passes**

Run: `swift test --filter EnvNameValidatorTests`
Expected: PASS.

**Step 5: Commit**

```bash
git add Sources/BroverCore Tests/BroverCoreTests
git commit -m "feat: add env models and name validation"
```

### Task 3: Add service protocols and in-memory stores

**Files:**
- Create: `Sources/BroverCore/Services/EnvService.swift`
- Create: `Sources/BroverCore/Services/KeychainService.swift`
- Create: `Sources/BroverCore/Stores/InMemoryProfileStore.swift`
- Create: `Tests/BroverCoreTests/InMemoryProfileStoreTests.swift`

**Step 1: Write the failing test**

Test add/list/toggle metadata behavior in memory store.

**Step 2: Run test to verify it fails**

Run: `swift test --filter InMemoryProfileStoreTests`
Expected: FAIL because store/protocols missing.

**Step 3: Write minimal implementation**

Create protocol-first services and thread-safe in-memory store.

**Step 4: Run test to verify it passes**

Run: `swift test --filter InMemoryProfileStoreTests`
Expected: PASS.

**Step 5: Commit**

```bash
git add Sources/BroverCore Tests/BroverCoreTests
git commit -m "feat: add service contracts and in-memory profile store"
```

### Task 4: Wire basic UI navigation and diagnostics placeholder

**Files:**
- Modify: `Sources/BroverApp/UI/RootView.swift`
- Create: `Sources/BroverApp/UI/Screens/EnvListView.swift`
- Create: `Sources/BroverApp/UI/Screens/ProfilesView.swift`
- Create: `Sources/BroverApp/UI/Screens/DiagnosticsView.swift`

**Step 1: Write the failing test**

Add smoke test that root view composes the screen titles.

**Step 2: Run test to verify it fails**

Run: `swift test --filter BroverAppTests`
Expected: FAIL because screens missing.

**Step 3: Write minimal implementation**

Implement split/tab layout with placeholder content and sample state.

**Step 4: Run test to verify it passes**

Run: `swift test --filter BroverAppTests`
Expected: PASS.

**Step 5: Commit**

```bash
git add Sources/BroverApp Tests/BroverAppTests
git commit -m "feat: add initial app screens and navigation skeleton"
```

### Task 5: Update docs and verify build

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

**Step 1: Write the failing check**

Define expected status sections for native scaffold in docs.

**Step 2: Run check to verify mismatch**

Run: `swift build`
Expected: PASS build but docs outdated (manual check fails).

**Step 3: Write minimal implementation**

Update docs with architecture, current phase status, and next steps.

**Step 4: Run check to verify it passes**

Run: `swift build && swift test`
Expected: PASS.

**Step 5: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: update native app bootstrap status"
```
