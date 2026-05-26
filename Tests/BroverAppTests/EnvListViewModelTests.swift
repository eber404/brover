import XCTest
@testable import BroverApp
@testable import BroverCore

@MainActor
final class EnvListViewModelTests: XCTestCase {
    func testSelectProfileUpdatesList() throws {
        let store = InMemoryProfileStore()
        try store.createProfile(name: "default")
        try store.createProfile(name: "work")
        store.createEnv(.init(name: "OPENAI_API_KEY", profile: "work", enabled: true))

        let manager = EnvManager(envService: store, keychainService: NoopKeychain(), authGate: AllowAllAuthGate())
        let vm = EnvListViewModel(manager: manager)

        vm.selectProfile("work")

        XCTAssertEqual(vm.selectedProfile, "work")
        XCTAssertEqual(vm.envs.first?.name, "OPENAI_API_KEY")
    }

    func testCopySetsMessage() throws {
        let store = InMemoryProfileStore()
        try store.createProfile(name: "default")
        store.createEnv(.init(name: "OPENAI_API_KEY", profile: "default", enabled: true))
        let keychain = MemoryKeychain(secret: "secret")

        let manager = EnvManager(envService: store, keychainService: keychain, authGate: AllowAllAuthGate())
        let vm = EnvListViewModel(manager: manager)

        vm.copy(.init(name: "OPENAI_API_KEY", profile: "default", enabled: true))

        XCTAssertEqual(vm.message, "Copied OPENAI_API_KEY to clipboard.")
    }
}

private final class NoopKeychain: KeychainService, @unchecked Sendable {
    func saveSecret(profile: String, name: String, value: String) throws {}
    func loadSecret(profile: String, name: String) throws -> String { "" }
    func deleteSecret(profile: String, name: String) throws {}
}

private final class MemoryKeychain: KeychainService, @unchecked Sendable {
    private let secret: String

    init(secret: String) {
        self.secret = secret
    }

    func saveSecret(profile: String, name: String, value: String) throws {}
    func loadSecret(profile: String, name: String) throws -> String { secret }
    func deleteSecret(profile: String, name: String) throws {}
}
