import Foundation

public protocol EnvService: Sendable {
    func listProfiles() -> [Profile]
    func listEnvs(profile: String) -> [EnvMetadata]
    func createEnv(_ metadata: EnvMetadata)
    func updateEnv(_ metadata: EnvMetadata)
    func deleteEnv(profile: String, name: String)
}
