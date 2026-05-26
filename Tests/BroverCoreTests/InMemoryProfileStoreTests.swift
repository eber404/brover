import XCTest
@testable import BroverCore

final class InMemoryProfileStoreTests: XCTestCase {
    func testCreateListAndDeleteEnv() {
        let store = InMemoryProfileStore()
        let env = EnvMetadata(name: "OPENAI_API_KEY", profile: "default", enabled: true)

        store.createEnv(env)

        XCTAssertEqual(store.listProfiles().map(\.name), ["default"])
        XCTAssertEqual(store.listEnvs(profile: "default").count, 1)

        store.deleteEnv(profile: "default", name: "OPENAI_API_KEY")
        XCTAssertTrue(store.listEnvs(profile: "default").isEmpty)
    }

    func testUpdateReplacesByName() {
        let store = InMemoryProfileStore()
        store.createEnv(.init(name: "DATABASE_URL", profile: "default", enabled: false))

        store.updateEnv(.init(name: "DATABASE_URL", profile: "default", enabled: true))

        XCTAssertEqual(store.listEnvs(profile: "default").first?.enabled, true)
    }
}
