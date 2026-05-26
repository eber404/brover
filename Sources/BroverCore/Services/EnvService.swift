import Foundation

public protocol EnvService: Sendable {
    func listProfiles() -> [Profile]
    func activeProfile() -> String
    func createProfile(name: String) throws
    func renameProfile(from oldName: String, to newName: String) throws
    func deleteProfile(name: String) throws
    func setActiveProfile(name: String) throws
    func listEnvs(profile: String) -> [EnvMetadata]
    func createEnv(_ metadata: EnvMetadata)
    func updateEnv(_ metadata: EnvMetadata)
    func deleteEnv(profile: String, name: String)
}

public enum ProfileStoreError: Error, Equatable {
    case duplicateProfile
    case profileNotFound
    case cannotDeleteActiveProfile
}
