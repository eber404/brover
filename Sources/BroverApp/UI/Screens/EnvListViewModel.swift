import BroverCore
import Foundation

@MainActor
final class EnvListViewModel: ObservableObject {
    @Published var profiles: [Profile] = []
    @Published var selectedProfile: String = "default"
    @Published var envs: [EnvMetadata] = []
    @Published var newName: String = ""
    @Published var newValue: String = ""
    @Published var newDescription: String = ""
    @Published var newEnabled: Bool = true
    @Published var editedValue: String = ""
    @Published var message: String?
    @Published var revealedValue: String?

    private let manager: EnvManager

    init(manager: EnvManager) {
        self.manager = manager
        refresh()
    }

    func refresh() {
        profiles = manager.listProfiles()
        if profiles.isEmpty {
            selectedProfile = "default"
        } else if !profiles.map(\.name).contains(selectedProfile) {
            selectedProfile = profiles[0].name
        }
        envs = manager.listEnvs(profile: selectedProfile)
    }

    func createEnv() {
        do {
            try manager.createEnv(
                name: newName.trimmingCharacters(in: .whitespacesAndNewlines),
                value: newValue,
                profile: selectedProfile,
                description: newDescription.isEmpty ? nil : newDescription,
                enabled: newEnabled
            )
            newName = ""
            newValue = ""
            newDescription = ""
            newEnabled = true
            refresh()
        } catch {
            message = "Failed to create env: \(error)"
        }
    }

    func reveal(_ env: EnvMetadata) {
        do {
            revealedValue = try manager.revealEnv(profile: env.profile, name: env.name)
        } catch {
            message = "Reveal denied or failed: \(error)"
        }
    }

    func updateValue(_ env: EnvMetadata) {
        do {
            try manager.updateEnvValue(profile: env.profile, name: env.name, value: editedValue)
            editedValue = ""
            message = "Value updated for \(env.name)."
        } catch {
            message = "Edit denied or failed: \(error)"
        }
    }

    func delete(_ env: EnvMetadata) {
        do {
            try manager.deleteEnv(profile: env.profile, name: env.name)
            refresh()
        } catch {
            message = "Delete denied or failed: \(error)"
        }
    }

    func setEnabled(_ env: EnvMetadata, enabled: Bool) {
        do {
            try manager.updateEnabled(profile: env.profile, name: env.name, enabled: enabled)
            refresh()
        } catch {
            message = "Failed to update status: \(error)"
        }
    }
}
