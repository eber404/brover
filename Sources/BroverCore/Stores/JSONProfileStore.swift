import Foundation

public final class JSONProfileStore: EnvService, @unchecked Sendable {
    private struct Config: Codable {
        var version: Int
        var activeProfile: String
        var profiles: [String: ProfileData]
    }

    private struct ProfileData: Codable {
        var envs: [String: EnvMetadata]
    }

    private let fileURL: URL
    private let lock = NSLock()

    public init(fileURL: URL) {
        self.fileURL = fileURL
    }

    public func listProfiles() -> [Profile] {
        lock.withLock {
            let config = loadConfig()
            return config.profiles.keys.sorted().map(Profile.init(name:))
        }
    }

    public func activeProfile() -> String {
        lock.withLock {
            loadConfig().activeProfile
        }
    }

    public func createProfile(name: String) throws {
        try lock.withLock {
            var config = loadConfig()
            guard config.profiles[name] == nil else {
                throw ProfileStoreError.duplicateProfile
            }
            config.profiles[name] = ProfileData(envs: [:])
            if config.activeProfile.isEmpty || config.activeProfile == "default" {
                config.activeProfile = name
            }
            saveConfig(config)
        }
    }

    public func renameProfile(from oldName: String, to newName: String) throws {
        try lock.withLock {
            var config = loadConfig()
            guard let data = config.profiles[oldName] else {
                throw ProfileStoreError.profileNotFound
            }
            guard config.profiles[newName] == nil else {
                throw ProfileStoreError.duplicateProfile
            }
            config.profiles.removeValue(forKey: oldName)
            config.profiles[newName] = data
            if config.activeProfile == oldName {
                config.activeProfile = newName
            }
            saveConfig(config)
        }
    }

    public func deleteProfile(name: String) throws {
        try lock.withLock {
            var config = loadConfig()
            guard config.profiles[name] != nil else {
                throw ProfileStoreError.profileNotFound
            }
            guard config.activeProfile != name else {
                throw ProfileStoreError.cannotDeleteActiveProfile
            }
            config.profiles.removeValue(forKey: name)
            saveConfig(config)
        }
    }

    public func setActiveProfile(name: String) throws {
        try lock.withLock {
            var config = loadConfig()
            guard config.profiles[name] != nil else {
                throw ProfileStoreError.profileNotFound
            }
            config.activeProfile = name
            saveConfig(config)
        }
    }

    public func listEnvs(profile: String) -> [EnvMetadata] {
        lock.withLock {
            let config = loadConfig()
            return config.profiles[profile]?.envs.values.sorted(by: { $0.name < $1.name }) ?? []
        }
    }

    public func createEnv(_ metadata: EnvMetadata) {
        lock.withLock {
            var config = loadConfig()
            var profileData = config.profiles[metadata.profile] ?? ProfileData(envs: [:])
            profileData.envs[metadata.name] = metadata
            config.profiles[metadata.profile] = profileData
            if config.activeProfile.isEmpty {
                config.activeProfile = metadata.profile
            }
            saveConfig(config)
        }
    }

    public func updateEnv(_ metadata: EnvMetadata) {
        createEnv(metadata)
    }

    public func deleteEnv(profile: String, name: String) {
        lock.withLock {
            var config = loadConfig()
            guard var profileData = config.profiles[profile] else { return }
            profileData.envs.removeValue(forKey: name)
            config.profiles[profile] = profileData
            saveConfig(config)
        }
    }

    private func loadConfig() -> Config {
        guard let data = try? Data(contentsOf: fileURL),
              let config = try? JSONDecoder().decode(Config.self, from: data)
        else {
            return Config(version: 1, activeProfile: "default", profiles: [:])
        }
        return config
    }

    private func saveConfig(_ config: Config) {
        let directory = fileURL.deletingLastPathComponent()
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let data = try? encoder.encode(config) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }
}

private extension NSLock {
    func withLock<T>(_ body: () throws -> T) rethrows -> T {
        lock()
        defer { unlock() }
        return try body()
    }
}
