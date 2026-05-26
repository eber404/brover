import Foundation
import XCTest
@testable import BroverCore

final class KeychainServiceTests: XCTestCase {
    func testSaveLoadDeleteSecretRoundTrip() throws {
        let service = NativeKeychainService(serviceName: "com.brover.secret.tests")
        let profile = "test-profile"
        let name = "TEST_SECRET_KEY"
        let value = "value-\(UUID().uuidString)"

        try? service.deleteSecret(profile: profile, name: name)
        try service.saveSecret(profile: profile, name: name, value: value)

        let loaded = try service.loadSecret(profile: profile, name: name)
        XCTAssertEqual(loaded, value)

        try service.deleteSecret(profile: profile, name: name)
        XCTAssertThrowsError(try service.loadSecret(profile: profile, name: name))
    }
}
