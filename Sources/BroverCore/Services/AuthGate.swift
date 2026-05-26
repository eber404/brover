import Foundation

public enum SensitiveAction: Sendable {
    case revealValue
    case copyValue
    case editValue
    case deleteEnv
    case changeSensitiveSettings
}

public protocol AuthGate: Sendable {
    func authorize(_ action: SensitiveAction) -> Bool
}

public struct SensitiveActionAuthorizer: Sendable {
    private let authGate: any AuthGate

    public init(authGate: any AuthGate) {
        self.authGate = authGate
    }

    public func canPerform(_ action: SensitiveAction) -> Bool {
        authGate.authorize(action)
    }
}

public struct AllowAllAuthGate: AuthGate {
    public init() {}

    public func authorize(_ action: SensitiveAction) -> Bool {
        true
    }
}
