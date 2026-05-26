import BroverCore
import Foundation
import LocalAuthentication

struct MacOSAuthGate: AuthGate {
    func authorize(_ action: SensitiveAction) -> Bool {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            return false
        }

        let reason = switch action {
        case .revealValue: "Authenticate to reveal secret"
        case .copyValue: "Authenticate to copy secret"
        case .editValue: "Authenticate to edit secret"
        case .deleteEnv: "Authenticate to delete environment variable"
        case .changeSensitiveSettings: "Authenticate to change sensitive settings"
        }

        let semaphore = DispatchSemaphore(value: 0)
        let result = AuthorizationResult()
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, _ in
            result.set(success)
            semaphore.signal()
        }
        semaphore.wait()
        return result.value
    }
}

private final class AuthorizationResult: @unchecked Sendable {
    private let lock = NSLock()
    private var storage = false

    var value: Bool {
        lock.lock()
        defer { lock.unlock() }
        return storage
    }

    func set(_ value: Bool) {
        lock.lock()
        storage = value
        lock.unlock()
    }
}
