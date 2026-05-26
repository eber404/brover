import Foundation

public final class InMemoryProfileStore: EnvService, @unchecked Sendable {
    private var storage: [String: [EnvMetadata]]
    private var selectedProfile: String
    private let lock = NSLock()

    public init(seed: [String: [EnvMetadata]] = [:]) {
        self.storage = seed
        self.selectedProfile = seed.keys.sorted().first ?? ""
    }

    public func listProfiles() -> [Profile] {
        lock.withLock {
            storage.keys.sorted().map(Profile.init(name:))
        }
    }

    public func activeProfile() -> String {
        lock.withLock { selectedProfile }
    }

    public func createProfile(name: String) throws {
        try lock.withLock {
            guard storage[name] == nil else {
                throw ProfileStoreError.duplicateProfile
            }
            storage[name] = []
            if selectedProfile.isEmpty || !storage.keys.contains(selectedProfile) {
                selectedProfile = name
            }
        }
    }

    public func renameProfile(from oldName: String, to newName: String) throws {
        try lock.withLock {
            guard storage[oldName] != nil else {
                throw ProfileStoreError.profileNotFound
            }
            guard storage[newName] == nil else {
                throw ProfileStoreError.duplicateProfile
            }
            storage[newName] = storage.removeValue(forKey: oldName)
            if selectedProfile == oldName {
                selectedProfile = newName
            }
        }
    }

    public func deleteProfile(name: String) throws {
        try lock.withLock {
            guard storage[name] != nil else {
                throw ProfileStoreError.profileNotFound
            }
            guard selectedProfile != name else {
                throw ProfileStoreError.cannotDeleteActiveProfile
            }
            storage.removeValue(forKey: name)
        }
    }

    public func setActiveProfile(name: String) throws {
        try lock.withLock {
            guard storage[name] != nil else {
                throw ProfileStoreError.profileNotFound
            }
            selectedProfile = name
        }
    }

    public func listEnvs(profile: String) -> [EnvMetadata] {
        lock.withLock {
            storage[profile, default: []].sorted(by: { $0.name < $1.name })
        }
    }

    public func createEnv(_ metadata: EnvMetadata) {
        lock.withLock {
            var envs = storage[metadata.profile, default: []]
            envs.removeAll(where: { $0.name == metadata.name })
            envs.append(metadata)
            storage[metadata.profile] = envs
        }
    }

    public func updateEnv(_ metadata: EnvMetadata) {
        createEnv(metadata)
    }

    public func deleteEnv(profile: String, name: String) {
        lock.withLock {
            var envs = storage[profile, default: []]
            envs.removeAll(where: { $0.name == name })
            storage[profile] = envs
        }
    }
}

private extension NSLock {
    func withLock<T>(_ body: () throws -> T) rethrows -> T {
        lock()
        defer { unlock() }
        return try body()
    }
}
