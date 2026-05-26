import Foundation

public final class InMemoryProfileStore: EnvService, @unchecked Sendable {
    private var storage: [String: [EnvMetadata]]
    private let lock = NSLock()

    public init(seed: [String: [EnvMetadata]] = [:]) {
        self.storage = seed
    }

    public func listProfiles() -> [Profile] {
        lock.withLock {
            storage.keys.sorted().map(Profile.init(name:))
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
    func withLock<T>(_ body: () -> T) -> T {
        lock()
        defer { unlock() }
        return body()
    }
}
