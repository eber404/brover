import XCTest
@testable import BroverCore

final class BroverAppTests: XCTestCase {
    func testBootstrapSeedDataExists() {
        let store = InMemoryProfileStore(seed: [
            "default": [EnvMetadata(name: "OPENAI_API_KEY", profile: "default", enabled: true)]
        ])

        XCTAssertEqual(store.listProfiles().first?.name, "default")
        XCTAssertEqual(store.listEnvs(profile: "default").first?.name, "OPENAI_API_KEY")
    }
}
