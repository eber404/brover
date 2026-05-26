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

    func testNormalizeEnvNameInputForcesUppercaseUnderscoreAndNoHyphen() {
        let manager = EnvManager(envService: InMemoryProfileStore(), keychainService: NoopKeychain(), authGate: AllowAllAuthGate())
        let vm = EnvListViewModel(manager: manager)

        let normalized = vm.normalizeEnvNameInput("my env-name")

        XCTAssertEqual(normalized, "MY_ENVNAME")
    }

    func testRevealSetsSecretAndCountdownAndHideClearsState() throws {
        let store = InMemoryProfileStore()
        try store.createProfile(name: "default")
        store.createEnv(.init(name: "OPENAI_API_KEY", profile: "default", enabled: true))
        let keychain = MemoryKeychain(secret: "sk_live_123")

        let manager = EnvManager(envService: store, keychainService: keychain, authGate: AllowAllAuthGate())
        let vm = EnvListViewModel(manager: manager)
        let env = EnvMetadata(name: "OPENAI_API_KEY", profile: "default", enabled: true)

        vm.reveal(env)

        XCTAssertEqual(vm.revealedValue, "sk_live_123")
        XCTAssertEqual(vm.revealCountdownLabel, "Auto-hide in 10s")

        vm.hideReveal()

        XCTAssertNil(vm.revealedValue)
        XCTAssertNil(vm.revealCountdownLabel)
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
