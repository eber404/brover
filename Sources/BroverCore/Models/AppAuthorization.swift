import Foundation

public struct AppAuthorization: Identifiable, Codable, Equatable, Sendable {
    public let id: UUID
    public var displayName: String
    public var bundleID: String
    public var enabled: Bool
    public var updatedAt: Date

    public init(
        id: UUID = UUID(),
        displayName: String,
        bundleID: String,
        enabled: Bool,
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.displayName = displayName
        self.bundleID = bundleID
        self.enabled = enabled
        self.updatedAt = updatedAt
    }
}
