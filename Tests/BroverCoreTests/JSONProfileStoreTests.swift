import Foundation
import XCTest
@testable import BroverCore

final class JSONProfileStoreTests: XCTestCase {
    func testPersistAndReloadMetadata() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let fileURL = root.appendingPathComponent("config.json")
        defer { try? FileManager.default.removeItem(at: root) }

        let store = JSONProfileStore(fileURL: fileURL)
        let env = EnvMetadata(name: "OPENAI_API_KEY", profile: "default", enabled: true, description: "Local key")

        store.createEnv(env)

        let reloaded = JSONProfileStore(fileURL: fileURL)
        let envs = reloaded.listEnvs(profile: "default")

        XCTAssertEqual(envs.count, 1)
        XCTAssertEqual(envs.first?.name, "OPENAI_API_KEY")
        XCTAssertNil(try JSONSerialization.jsonObject(with: Data(contentsOf: fileURL)) as? String)
    }
}
