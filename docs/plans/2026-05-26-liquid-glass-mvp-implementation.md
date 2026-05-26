# Liquid Glass MVP UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the approved Liquid Glass MVP UX with a 3-tab sidebar (`Apps`, `Profiles`, `Secrets/Envs`) and manual app allowlist management.

**Architecture:** Keep current SwiftUI shell and BroverCore service boundaries, then add one workspace at a time with test-first increments. Introduce `AppAuthorization` model/store/service in BroverCore, then wire sidebar and workspace routing in BroverApp view models/views. Preserve Keychain-only secret values and auth-gated sensitive actions.

**Tech Stack:** Swift 6, SwiftUI, AppKit (`NSVisualEffectView`), Security.framework, LocalAuthentication, XCTest.

---

### Task 1: Add App Authorization Domain Model + Validation

**Files:**
- Create: `Sources/BroverCore/Models/AppAuthorization.swift`
- Create: `Sources/BroverCore/Validation/BundleIDValidator.swift`
- Test: `Tests/BroverCoreTests/BundleIDValidatorTests.swift`

**Step 1: Write the failing test**

Create `Tests/BroverCoreTests/BundleIDValidatorTests.swift`:

```swift
import XCTest
@testable import BroverCore

final class BundleIDValidatorTests: XCTestCase {
    func testValidBundleIDs() {
        XCTAssertTrue(BundleIDValidator.isValid("com.apple.Terminal"))
        XCTAssertTrue(BundleIDValidator.isValid("io.github.eber404.brover"))
    }

    func testInvalidBundleIDs() {
        XCTAssertFalse(BundleIDValidator.isValid(""))
        XCTAssertFalse(BundleIDValidator.isValid("terminal"))
        XCTAssertFalse(BundleIDValidator.isValid("com..apple"))
        XCTAssertFalse(BundleIDValidator.isValid("com apple terminal"))
    }
}
```

**Step 2: Run test to verify it fails**

Run: `swift test --filter BundleIDValidatorTests`
Expected: FAIL with missing `BundleIDValidator` symbol.

**Step 3: Write minimal implementation**

Create `Sources/BroverCore/Validation/BundleIDValidator.swift`:

```swift
import Foundation

public enum BundleIDValidator {
    private static let regex = try? NSRegularExpression(pattern: "^[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)+$")

    public static func isValid(_ bundleID: String) -> Bool {
        guard !bundleID.isEmpty, let regex else { return false }
        let range = NSRange(bundleID.startIndex..<bundleID.endIndex, in: bundleID)
        return regex.firstMatch(in: bundleID, options: [], range: range) != nil
    }
}
```

Create `Sources/BroverCore/Models/AppAuthorization.swift`:

```swift
import Foundation

public struct AppAuthorization: Identifiable, Codable, Equatable, Sendable {
    public let id: UUID
    public var displayName: String
    public var bundleID: String
    public var enabled: Bool
    public var updatedAt: Date

    public init(
        id: UUID = UUID(),
        displayName: String,
        bundleID: String,
        enabled: Bool,
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.displayName = displayName
        self.bundleID = bundleID
        self.enabled = enabled
        self.updatedAt = updatedAt
    }
}
```

**Step 4: Run test to verify it passes**

Run: `swift test --filter BundleIDValidatorTests`
Expected: PASS.

**Step 5: Commit**

```bash
git add Sources/BroverCore/Models/AppAuthorization.swift Sources/BroverCore/Validation/BundleIDValidator.swift Tests/BroverCoreTests/BundleIDValidatorTests.swift
git commit -m "feat: add app authorization model and bundle id validator"
```

### Task 2: Add App Authorization Store + Service

**Files:**
- Create: `Sources/BroverCore/Services/AppAuthorizationService.swift`
- Create: `Sources/BroverCore/Stores/JSONAppAuthorizationStore.swift`
- Test: `Tests/BroverCoreTests/JSONAppAuthorizationStoreTests.swift`

**Step 1: Write the failing test**

Create `Tests/BroverCoreTests/JSONAppAuthorizationStoreTests.swift`:

```swift
import Foundation
import XCTest
@testable import BroverCore

final class JSONAppAuthorizationStoreTests: XCTestCase {
    func testCreateListToggleDeleteAuthorization() {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let file = root.appendingPathComponent("apps.json")
        defer { try? FileManager.default.removeItem(at: root) }

        let store = JSONAppAuthorizationStore(fileURL: file)
        let auth = AppAuthorization(displayName: "Terminal", bundleID: "com.apple.Terminal", enabled: true)
        store.create(auth)

        XCTAssertEqual(store.list().count, 1)

        store.setEnabled(bundleID: "com.apple.Terminal", enabled: false)
        XCTAssertEqual(store.list().first?.enabled, false)

        store.delete(bundleID: "com.apple.Terminal")
        XCTAssertTrue(store.list().isEmpty)
    }
}
```

**Step 2: Run test to verify it fails**

Run: `swift test --filter JSONAppAuthorizationStoreTests`
Expected: FAIL with missing store/service symbols.

**Step 3: Write minimal implementation**

Create service and JSON store that:
- stores records by `bundleID` key;
- enforces unique `bundleID`;
- supports create/list/toggle/delete.

**Step 4: Run test to verify it passes**

Run: `swift test --filter JSONAppAuthorizationStoreTests`
Expected: PASS.

**Step 5: Commit**

```bash
git add Sources/BroverCore/Services/AppAuthorizationService.swift Sources/BroverCore/Stores/JSONAppAuthorizationStore.swift Tests/BroverCoreTests/JSONAppAuthorizationStoreTests.swift
git commit -m "feat: add app authorization JSON store"
```

### Task 3: Add Apps Workspace ViewModel

**Files:**
- Create: `Sources/BroverApp/UI/Screens/AppsViewModel.swift`
- Test: `Tests/BroverAppTests/AppsViewModelTests.swift`

**Step 1: Write the failing test**

Create `Tests/BroverAppTests/AppsViewModelTests.swift` with fake service:

```swift
import XCTest
@testable import BroverApp
@testable import BroverCore

final class AppsViewModelTests: XCTestCase {
    func testAddAppWithValidBundleIDSucceeds() {
        let vm = AppsViewModel(service: FakeAppAuthorizationService())
        vm.newDisplayName = "Terminal"
        vm.newBundleID = "com.apple.Terminal"

        vm.addApp()

        XCTAssertEqual(vm.apps.count, 1)
        XCTAssertNil(vm.message)
    }

    func testAddAppWithInvalidBundleIDFails() {
        let vm = AppsViewModel(service: FakeAppAuthorizationService())
        vm.newDisplayName = "Terminal"
        vm.newBundleID = "terminal"

        vm.addApp()

        XCTAssertEqual(vm.apps.count, 0)
        XCTAssertNotNil(vm.message)
    }
}
```

**Step 2: Run test to verify it fails**

Run: `swift test --filter AppsViewModelTests`
Expected: FAIL due to missing `AppsViewModel`.

**Step 3: Write minimal implementation**

Implement `AppsViewModel` with:
- published `apps`, `newDisplayName`, `newBundleID`, `message`;
- `refresh()`, `addApp()`, `toggle()`, `remove()` methods;
- use `BundleIDValidator` before service call.

**Step 4: Run test to verify it passes**

Run: `swift test --filter AppsViewModelTests`
Expected: PASS.

**Step 5: Commit**

```bash
git add Sources/BroverApp/UI/Screens/AppsViewModel.swift Tests/BroverAppTests/AppsViewModelTests.swift
git commit -m "feat: add apps workspace view model"
```

### Task 4: Build Apps Workspace View (Liquid Glass)

**Files:**
- Create: `Sources/BroverApp/UI/Screens/AppsView.swift`
- Modify: `Sources/BroverApp/UI/VisualEffectView.swift`
- Test: `Tests/BroverAppTests/AppsWorkspaceSmokeTests.swift`

**Step 1: Write the failing test**

Create `Tests/BroverAppTests/AppsWorkspaceSmokeTests.swift`:

```swift
import XCTest
@testable import BroverApp

final class AppsWorkspaceSmokeTests: XCTestCase {
    func testAppsWorkspaceSymbolsCompile() {
        _ = String(describing: AppsView.self)
        XCTAssertTrue(true)
    }
}
```

**Step 2: Run test to verify it fails**

Run: `swift test --filter AppsWorkspaceSmokeTests`
Expected: FAIL due to missing `AppsView`.

**Step 3: Write minimal implementation**

Implement `AppsView`:
- top bar (`Apps`, subtitle, `Add App` action);
- create form (`displayName`, `bundleID`);
- list rows (`displayName`, `bundleID`, toggle, remove);
- empty state card + CTA;
- info alert for errors.

**Step 4: Run test to verify it passes**

Run: `swift test --filter AppsWorkspaceSmokeTests`
Expected: PASS.

**Step 5: Commit**

```bash
git add Sources/BroverApp/UI/Screens/AppsView.swift Sources/BroverApp/UI/VisualEffectView.swift Tests/BroverAppTests/AppsWorkspaceSmokeTests.swift
git commit -m "feat: add apps workspace UI"
```

### Task 5: Refactor Root Navigation to Fixed 3 Tabs

**Files:**
- Modify: `Sources/BroverApp/UI/RootView.swift`
- Modify: `Sources/BroverApp/UI/Screens/ProfilesView.swift`
- Modify: `Sources/BroverApp/UI/Screens/EnvListView.swift`
- Test: `Tests/BroverAppTests/RootNavigationTests.swift`

**Step 1: Write the failing test**

Create `Tests/BroverAppTests/RootNavigationTests.swift`:

```swift
import XCTest
@testable import BroverApp

final class RootNavigationTests: XCTestCase {
    func testSidebarRoutesExist() {
        let labels = RootRoute.allCases.map(\.title)
        XCTAssertEqual(labels, ["Apps", "Profiles", "Secrets/Envs"])
    }
}
```

**Step 2: Run test to verify it fails**

Run: `swift test --filter RootNavigationTests`
Expected: FAIL due to missing `RootRoute`.

**Step 3: Write minimal implementation**

Add `RootRoute` enum and use it in `RootView`:
- ensure sidebar contains exactly 3 entries;
- default selection to `Secrets/Envs`;
- wire to `AppsView`, `ProfilesView`, `EnvListView`.

**Step 4: Run test to verify it passes**

Run: `swift test --filter RootNavigationTests`
Expected: PASS.

**Step 5: Commit**

```bash
git add Sources/BroverApp/UI/RootView.swift Sources/BroverApp/UI/Screens/ProfilesView.swift Sources/BroverApp/UI/Screens/EnvListView.swift Tests/BroverAppTests/RootNavigationTests.swift
git commit -m "feat: enforce fixed sidebar navigation"
```

### Task 6: Docs Sync + Final Verification

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

**Step 1: Write the failing check**

List required doc updates:
- mention `Apps` workspace scope (manual allowlist only);
- mention 3-tab sidebar IA;
- mention bundle ID validation and local apps metadata.

**Step 2: Run verification to capture current baseline**

Run: `swift build && swift test`
Expected: PASS build/tests while docs still stale.

**Step 3: Write minimal implementation**

Update docs to match implemented UX architecture and MVP scope.

**Step 4: Run verification to ensure clean state**

Run: `swift build && swift test`
Expected: PASS with no failing tests.

**Step 5: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: sync liquid glass MVP UX architecture"
```

### Task 7: Integration Commit and Push

**Files:**
- Modify: repository history only

**Step 1: Verify branch status**

Run: `git status --short`
Expected: clean working tree.

**Step 2: Review final diff summary**

Run: `git log --oneline -10`
Expected: sequence of focused commits from tasks above.

**Step 3: Push branch**

Run: `git push origin main`
Expected: remote updated.

**Step 4: Tag release checkpoint (optional)**

Run: `git tag -a ux-mvp-checkpoint -m "Liquid Glass MVP UX checkpoint"`
Expected: local tag created.

**Step 5: Push tag (optional)**

Run: `git push origin ux-mvp-checkpoint`
Expected: remote tag available.
