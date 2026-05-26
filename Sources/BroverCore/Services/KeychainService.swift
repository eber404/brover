import Foundation

public protocol KeychainService: Sendable {
    func saveSecret(profile: String, name: String, value: String) throws
    func loadSecret(profile: String, name: String) throws -> String
    func deleteSecret(profile: String, name: String) throws
}
