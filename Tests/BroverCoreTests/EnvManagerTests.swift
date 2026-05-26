import XCTest
@testable import BroverCore

final class EnvManagerTests: XCTestCase {
    func testCreateRevealDeleteFlow() throws {
        let store = InMemoryProfileStore()
        let keychain = InMemoryKeychainService()
        let gate = StubAuthGate(allowed: true)
        let manager = EnvManager(envService: store, keychainService: keychain, authGate: gate)

        try manager.createEnv(
            name: "OPENAI_API_KEY",
            value: "secret-123",
            profile: "default",
            description: "test key",
            enabled: true
        )

        XCTAssertEqual(store.listEnvs(profile: "default").count, 1)
        XCTAssertEqual(try manager.revealEnv(profile: "default", name: "OPENAI_API_KEY"), "secret-123")

        try manager.deleteEnv(profile: "default", name: "OPENAI_API_KEY")
        XCTAssertTrue(store.listEnvs(profile: "default").isEmpty)
        XCTAssertThrowsError(try keychain.loadSecret(profile: "default", name: "OPENAI_API_KEY"))
    }

    func testCreateRejectsInvalidEnvName() {
        let store = InMemoryProfileStore()
        let keychain = InMemoryKeychainService()
        let gate = StubAuthGate(allowed: true)
        let manager = EnvManager(envService: store, keychainService: keychain, authGate: gate)

        XCTAssertThrowsError(
            try manager.createEnv(name: "BAD KEY", value: "x", profile: "default", description: nil, enabled: true)
        )
    }

    func testSensitiveActionsRequireAuth() throws {
        let store = InMemoryProfileStore()
        let keychain = InMemoryKeychainService()
        let gate = StubAuthGate(allowed: false)
        let manager = EnvManager(envService: store, keychainService: keychain, authGate: gate)

        store.createEnv(.init(name: "OPENAI_API_KEY", profile: "default", enabled: true))
        try keychain.saveSecret(profile: "default", name: "OPENAI_API_KEY", value: "top-secret")

        XCTAssertThrowsError(try manager.revealEnv(profile: "default", name: "OPENAI_API_KEY"))
        XCTAssertThrowsError(try manager.deleteEnv(profile: "default", name: "OPENAI_API_KEY"))
    }
}

private struct StubAuthGate: AuthGate {
    let allowed: Bool

    func authorize(_ action: SensitiveAction) -> Bool {
        allowed
    }
}

private final class InMemoryKeychainService: KeychainService, @unchecked Sendable {
    private var map: [String: String] = [:]

    func saveSecret(profile: String, name: String, value: String) throws {
        map["\(profile):\(name)"] = value
    }

    func loadSecret(profile: String, name: String) throws -> String {
        guard let value = map["\(profile):\(name)"] else {
            throw KeychainServiceError.itemNotFound
        }
        return value
    }

    func deleteSecret(profile: String, name: String) throws {
        map.removeValue(forKey: "\(profile):\(name)")
    }
}
