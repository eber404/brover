import XCTest
@testable import BroverCore

final class BundleIDValidatorTests: XCTestCase {
    func testValidBundleIDs() {
        XCTAssertTrue(BundleIDValidator.isValid("com.apple.Terminal"))
        XCTAssertTrue(BundleIDValidator.isValid("io.github.eber404.brover"))
    }

    func testInvalidBundleIDs() {
        XCTAssertFalse(BundleIDValidator.isValid(""))
        XCTAssertFalse(BundleIDValidator.isValid("terminal"))
        XCTAssertFalse(BundleIDValidator.isValid("com..apple"))
        XCTAssertFalse(BundleIDValidator.isValid("com apple terminal"))
    }
}
