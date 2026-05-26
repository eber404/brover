import BroverCore
import Foundation

@MainActor
final class ProfilesViewModel: ObservableObject {
    @Published var profiles: [Profile] = []
    @Published var activeProfile: String = "default"
    @Published var newProfileName: String = ""
    @Published var renameSource: String = ""
    @Published var renameTarget: String = ""
    @Published var selectedProfile: String = ""
    @Published var message: String?

    private let manager: EnvManager

    init(manager: EnvManager) {
        self.manager = manager
        refresh()
    }

    func refresh() {
        profiles = manager.listProfiles()
        activeProfile = manager.activeProfile()
        if selectedProfile.isEmpty {
            selectedProfile = activeProfile
        }
        if !profiles.map(\.name).contains(selectedProfile) {
            selectedProfile = activeProfile
        }
        if renameSource.isEmpty, let first = profiles.first?.name {
            renameSource = first
        }
    }

    func select(_ profile: Profile) {
        selectedProfile = profile.name
        renameSource = profile.name
    }

    func createProfile() {
        let name = newProfileName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else {
            message = "Profile name cannot be empty."
            return
        }
        do {
            try manager.createProfile(name: name)
            newProfileName = ""
            refresh()
        } catch {
            message = "Failed to create profile: \(error)"
        }
    }

    func renameProfile() {
        let oldName = renameSource
        let newName = renameTarget.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !oldName.isEmpty, !newName.isEmpty else {
            message = "Rename requires source and target."
            return
        }
        do {
            try manager.renameProfile(from: oldName, to: newName)
            renameTarget = ""
            refresh()
        } catch {
            message = "Failed to rename profile: \(error)"
        }
    }

    func setActive(_ profile: Profile) {
        do {
            try manager.setActiveProfile(name: profile.name)
            refresh()
        } catch {
            message = "Failed to set active profile: \(error)"
        }
    }

    func delete(_ profile: Profile) {
        do {
            try manager.deleteProfile(name: profile.name)
            refresh()
        } catch {
            message = "Failed to delete profile: \(error)"
        }
    }
}
