import Foundation
import Security

public enum KeychainServiceError: Error, Equatable {
    case itemNotFound
    case invalidData
    case osStatus(OSStatus)
}

public struct NativeKeychainService: KeychainService, Sendable {
    private let serviceName: String

    public init(serviceName: String = "com.brover.secret") {
        self.serviceName = serviceName
    }

    public func saveSecret(profile: String, name: String, value: String) throws {
        let account = account(profile: profile, name: name)
        let data = Data(value.utf8)

        let baseQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: account
        ]

        let updateStatus = SecItemUpdate(
            baseQuery as CFDictionary,
            [kSecValueData as String: data] as CFDictionary
        )

        if updateStatus == errSecSuccess {
            return
        }

        if updateStatus != errSecItemNotFound {
            throw KeychainServiceError.osStatus(updateStatus)
        }

        var addQuery = baseQuery
        addQuery[kSecValueData as String] = data
        let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
        guard addStatus == errSecSuccess else {
            throw KeychainServiceError.osStatus(addStatus)
        }
    }

    public func loadSecret(profile: String, name: String) throws -> String {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: account(profile: profile, name: name),
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecItemNotFound {
            throw KeychainServiceError.itemNotFound
        }

        guard status == errSecSuccess else {
            throw KeychainServiceError.osStatus(status)
        }

        guard let data = result as? Data,
              let value = String(data: data, encoding: .utf8)
        else {
            throw KeychainServiceError.invalidData
        }

        return value
    }

    public func deleteSecret(profile: String, name: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: account(profile: profile, name: name)
        ]

        let status = SecItemDelete(query as CFDictionary)
        if status == errSecItemNotFound {
            return
        }

        guard status == errSecSuccess else {
            throw KeychainServiceError.osStatus(status)
        }
    }

    private func account(profile: String, name: String) -> String {
        "\(profile):\(name)"
    }
}
