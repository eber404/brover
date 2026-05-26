import Foundation

public protocol AppAuthorizationService: Sendable {
    func list() -> [AppAuthorization]
    func create(_ app: AppAuthorization) throws
    func setEnabled(bundleID: String, enabled: Bool) throws
    func delete(bundleID: String) throws
}

public enum AppAuthorizationError: Error, Equatable {
    case invalidBundleID
    case duplicateBundleID
    case notFound
}
