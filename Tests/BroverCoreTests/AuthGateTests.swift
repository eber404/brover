import XCTest
@testable import BroverCore

final class AuthGateTests: XCTestCase {
    func testDeniedActionReturnsFalse() {
        let gate = StubAuthGate(allowed: false)
        let authorizer = SensitiveActionAuthorizer(authGate: gate)

        XCTAssertFalse(authorizer.canPerform(.revealValue))
    }

    func testAllowedActionReturnsTrue() {
        let gate = StubAuthGate(allowed: true)
        let authorizer = SensitiveActionAuthorizer(authGate: gate)

        XCTAssertTrue(authorizer.canPerform(.deleteEnv))
    }
}

private struct StubAuthGate: AuthGate {
    let allowed: Bool

    func authorize(_ action: SensitiveAction) -> Bool {
        allowed
    }
}
