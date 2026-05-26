import BroverCore
import Foundation
#if canImport(AppKit)
import AppKit
#endif

@MainActor
final class EnvListViewModel: ObservableObject {
    private enum RevealState {
        static let autoHideDuration: TimeInterval = 10
    }

    @Published var profiles: [Profile] = []
    @Published var selectedProfile: String = "default"
    @Published var envs: [EnvMetadata] = []
    @Published var selectedEnvName: String?
    @Published var newName: String = ""
    @Published var newValue: String = ""
    @Published var newDescription: String = ""
    @Published var newEnabled: Bool = true
    @Published var editedValue: String = ""
    @Published var message: String?
    @Published var revealedValue: String?
    @Published var copiedName: String?
    @Published var revealCountdownLabel: String?

    private let manager: EnvManager
    private var revealExpiryDate: Date?
    private var revealTimer: Timer?

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
        if let selectedEnvName,
           !envs.contains(where: { $0.name == selectedEnvName }) {
            self.selectedEnvName = envs.first?.name
        }
        if self.selectedEnvName == nil {
            self.selectedEnvName = envs.first?.name
        }
    }

    func normalizeEnvNameInput(_ raw: String) -> String {
        let uppercased = raw.uppercased()
        let withUnderscores = uppercased.replacingOccurrences(of: "\\s+", with: "_", options: .regularExpression)
        let withoutHyphens = withUnderscores.replacingOccurrences(of: "-", with: "")
        return withoutHyphens
    }

    var selectedEnv: EnvMetadata? {
        guard let selectedEnvName else { return nil }
        return envs.first(where: { $0.name == selectedEnvName })
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

    @discardableResult
    func createEnv() -> Bool {
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
            return true
        } catch {
            message = "Failed to create env: \(error)"
            return false
        }
    }

    func reveal(_ env: EnvMetadata) {
        do {
            revealTimer?.invalidate()
            revealedValue = try manager.revealEnv(profile: env.profile, name: env.name)
            revealExpiryDate = Date().addingTimeInterval(RevealState.autoHideDuration)
            updateRevealCountdownLabel()
            revealTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
                guard let self else { return }
                self.tickRevealCountdown()
            }
        } catch {
            message = "Reveal denied or failed: \(error)"
        }
    }

    func hideReveal() {
        revealTimer?.invalidate()
        revealTimer = nil
        revealExpiryDate = nil
        revealedValue = nil
        revealCountdownLabel = nil
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

    private func tickRevealCountdown() {
        guard let revealExpiryDate else {
            hideReveal()
            return
        }

        if revealExpiryDate <= Date() {
            hideReveal()
            return
        }

        updateRevealCountdownLabel()
    }

    private func updateRevealCountdownLabel() {
        guard let revealExpiryDate else {
            revealCountdownLabel = nil
            return
        }

        let remaining = max(1, Int(ceil(revealExpiryDate.timeIntervalSinceNow)))
        revealCountdownLabel = "Auto-hide in \(remaining)s"
    }
}
