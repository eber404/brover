import XCTest
@testable import BroverApp
@testable import BroverCore

@MainActor
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

private final class FakeAppAuthorizationService: AppAuthorizationService, @unchecked Sendable {
    private var storage: [String: AppAuthorization] = [:]

    func list() -> [AppAuthorization] {
        storage.values.sorted(by: { $0.displayName < $1.displayName })
    }

    func create(_ app: AppAuthorization) throws {
        if storage[app.bundleID] != nil {
            throw AppAuthorizationError.duplicateBundleID
        }
        storage[app.bundleID] = app
    }

    func setEnabled(bundleID: String, enabled: Bool) throws {
        guard var app = storage[bundleID] else {
            throw AppAuthorizationError.notFound
        }
        app.enabled = enabled
        storage[bundleID] = app
    }

    func delete(bundleID: String) throws {
        guard storage.removeValue(forKey: bundleID) != nil else {
            throw AppAuthorizationError.notFound
        }
    }
}
