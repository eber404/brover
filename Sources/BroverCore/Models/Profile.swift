import Foundation

public struct Profile: Identifiable, Codable, Equatable, Sendable {
    public var id: String { name }
    public let name: String

    public init(name: String) {
        self.name = name
    }
}
