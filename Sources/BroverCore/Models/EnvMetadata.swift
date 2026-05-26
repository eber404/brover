import Foundation

public struct EnvMetadata: Identifiable, Codable, Equatable, Sendable {
    public let id: UUID
    public var name: String
    public var profile: String
    public var enabled: Bool
    public var description: String?
    public var updatedAt: Date

    public init(
        id: UUID = UUID(),
        name: String,
        profile: String,
        enabled: Bool,
        description: String? = nil,
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.profile = profile
        self.enabled = enabled
        self.description = description
        self.updatedAt = updatedAt
    }
}
