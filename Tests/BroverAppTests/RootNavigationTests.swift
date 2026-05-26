import XCTest
@testable import BroverApp

final class RootNavigationTests: XCTestCase {
    func testSidebarRoutesExist() {
        let labels = RootRoute.allCases.map(\.title)
        XCTAssertEqual(labels, ["Apps", "Profiles", "Secrets/Envs"])
    }
}
