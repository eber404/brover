import Foundation

public enum EnvManagerError: Error, Equatable {
    case invalidName
    case unauthorized
    case notFound
}

public final class EnvManager: Sendable {
    private let envService: any EnvService
    private let keychainService: any KeychainService
    private let authGate: any AuthGate

    public init(
        envService: any EnvService,
        keychainService: any KeychainService,
        authGate: any AuthGate
    ) {
        self.envService = envService
        self.keychainService = keychainService
        self.authGate = authGate
    }

    public func listProfiles() -> [Profile] {
        envService.listProfiles()
    }

    public func listEnvs(profile: String) -> [EnvMetadata] {
        envService.listEnvs(profile: profile)
    }

    public func createEnv(
        name: String,
        value: String,
        profile: String,
        description: String?,
        enabled: Bool
    ) throws {
        guard EnvNameValidator.isValid(name) else {
            throw EnvManagerError.invalidName
        }

        try keychainService.saveSecret(profile: profile, name: name, value: value)
        envService.createEnv(
            EnvMetadata(
                name: name,
                profile: profile,
                enabled: enabled,
                description: description
            )
        )
    }

    public func updateEnvValue(profile: String, name: String, value: String) throws {
        guard authGate.authorize(.editValue) else {
            throw EnvManagerError.unauthorized
        }
        try keychainService.saveSecret(profile: profile, name: name, value: value)
    }

    public func updateEnabled(profile: String, name: String, enabled: Bool) throws {
        guard var env = envService.listEnvs(profile: profile).first(where: { $0.name == name }) else {
            throw EnvManagerError.notFound
        }
        env.enabled = enabled
        env.updatedAt = Date()
        envService.updateEnv(env)
    }

    public func revealEnv(profile: String, name: String) throws -> String {
        guard authGate.authorize(.revealValue) else {
            throw EnvManagerError.unauthorized
        }
        return try keychainService.loadSecret(profile: profile, name: name)
    }

    public func deleteEnv(profile: String, name: String) throws {
        guard authGate.authorize(.deleteEnv) else {
            throw EnvManagerError.unauthorized
        }
        try keychainService.deleteSecret(profile: profile, name: name)
        envService.deleteEnv(profile: profile, name: name)
    }
}
