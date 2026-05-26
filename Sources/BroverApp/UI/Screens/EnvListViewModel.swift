import BroverCore
import Foundation
#if canImport(AppKit)
import AppKit
#endif

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
    @Published var copiedName: String?

    private let manager: EnvManager

    init(manager: EnvManager) {
        self.manager = manager
        refresh()
    }

    func refresh() {
        profiles = manager.listProfiles()
        let active = manager.activeProfile()
        if profiles.isEmpty {
            selectedProfile = active
        } else if !profiles.map(\.name).contains(selectedProfile) {
            selectedProfile = active
        } else if selectedProfile.isEmpty {
            selectedProfile = profiles[0].name
        }
        envs = manager.listEnvs(profile: selectedProfile)
    }

    func selectProfile(_ profile: String) {
        do {
            try manager.setActiveProfile(name: profile)
            selectedProfile = profile
            refresh()
        } catch {
            message = "Failed to switch profile: \(error)"
        }
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
            DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
                guard let self else { return }
                self.revealedValue = nil
            }
        } catch {
            message = "Reveal denied or failed: \(error)"
        }
    }

    func copy(_ env: EnvMetadata) {
        do {
            let secret = try manager.copyEnv(profile: env.profile, name: env.name)
            #if canImport(AppKit)
            let pasteboard = NSPasteboard.general
            pasteboard.clearContents()
            pasteboard.setString(secret, forType: .string)
            #endif
            copiedName = env.name
            message = "Copied \(env.name) to clipboard."
        } catch {
            message = "Copy denied or failed: \(error)"
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
