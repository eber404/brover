import XCTest
@testable import BroverApp
@testable import BroverCore

@MainActor
final class ProfilesViewModelTests: XCTestCase {
    func testCreateAndSetActiveProfile() throws {
        let vm = ProfilesViewModel(manager: makeManager())
        vm.newProfileName = "work"

        vm.createProfile()

        XCTAssertEqual(vm.profiles.map(\.name), ["work"])
        XCTAssertEqual(vm.activeProfile, "work")
    }

    func testRenameProfile() throws {
        let vm = ProfilesViewModel(manager: makeManager())
        vm.newProfileName = "work"
        vm.createProfile()
        vm.renameSource = "work"
        vm.renameTarget = "office"

        vm.renameProfile()

        XCTAssertEqual(vm.profiles.map(\.name), ["office"])
    }

    private func makeManager() -> EnvManager {
        EnvManager(
            envService: InMemoryProfileStore(),
            keychainService: InMemoryKeychainService(),
            authGate: AllowAllAuthGate()
        )
    }
}

private final class InMemoryKeychainService: KeychainService, @unchecked Sendable {
    func saveSecret(profile: String, name: String, value: String) throws {}
    func loadSecret(profile: String, name: String) throws -> String { "" }
    func deleteSecret(profile: String, name: String) throws {}
}
