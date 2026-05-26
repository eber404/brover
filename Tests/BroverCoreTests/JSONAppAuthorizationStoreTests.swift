import Foundation
import XCTest
@testable import BroverCore

final class JSONAppAuthorizationStoreTests: XCTestCase {
    func testCreateListToggleDeleteAuthorization() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let file = root.appendingPathComponent("apps.json")
        defer { try? FileManager.default.removeItem(at: root) }

        let store = JSONAppAuthorizationStore(fileURL: file)
        let app = AppAuthorization(displayName: "Terminal", bundleID: "com.apple.Terminal", enabled: true)

        try store.create(app)
        XCTAssertEqual(store.list().count, 1)

        try store.setEnabled(bundleID: "com.apple.Terminal", enabled: false)
        XCTAssertEqual(store.list().first?.enabled, false)

        try store.delete(bundleID: "com.apple.Terminal")
        XCTAssertTrue(store.list().isEmpty)
    }
}
