import XCTest
@testable import BroverCore

final class EnvNameValidatorTests: XCTestCase {
    func testValidNames() {
        XCTAssertTrue(EnvNameValidator.isValid("OPENAI_API_KEY"))
        XCTAssertTrue(EnvNameValidator.isValid("_TOKEN"))
        XCTAssertTrue(EnvNameValidator.isValid("DATABASE_URL_2"))
    }

    func testInvalidNames() {
        XCTAssertFalse(EnvNameValidator.isValid(""))
        XCTAssertFalse(EnvNameValidator.isValid("1TOKEN"))
        XCTAssertFalse(EnvNameValidator.isValid("MY KEY"))
        XCTAssertFalse(EnvNameValidator.isValid("API-KEY"))
        XCTAssertFalse(EnvNameValidator.isValid("TOKEN=value"))
    }
}
