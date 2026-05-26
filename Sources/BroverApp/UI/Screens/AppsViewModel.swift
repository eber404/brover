import BroverCore
import Foundation

@MainActor
final class AppsViewModel: ObservableObject {
    @Published var apps: [AppAuthorization] = []
    @Published var selectedBundleID: String?
    @Published var newDisplayName: String = ""
    @Published var newBundleID: String = ""
    @Published var message: String?

    private let service: any AppAuthorizationService

    init(service: any AppAuthorizationService) {
        self.service = service
        refresh()
    }

    func refresh() {
        apps = service.list()
        if let selectedBundleID,
           !apps.contains(where: { $0.bundleID == selectedBundleID }) {
            self.selectedBundleID = apps.first?.bundleID
        }
        if self.selectedBundleID == nil {
            self.selectedBundleID = apps.first?.bundleID
        }
    }

    var selectedApp: AppAuthorization? {
        guard let selectedBundleID else { return nil }
        return apps.first(where: { $0.bundleID == selectedBundleID })
    }

    func addApp() {
        let bundleID = newBundleID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard BundleIDValidator.isValid(bundleID) else {
            message = "Invalid bundle ID. Expected reverse-DNS format."
            return
        }

        do {
            try service.create(
                AppAuthorization(
                    displayName: newDisplayName.trimmingCharacters(in: .whitespacesAndNewlines),
                    bundleID: bundleID,
                    enabled: true
                )
            )
            newDisplayName = ""
            newBundleID = ""
            message = nil
            refresh()
        } catch {
            message = "Failed to add app: \(error)"
        }
    }

    func toggle(_ app: AppAuthorization) {
        do {
            try service.setEnabled(bundleID: app.bundleID, enabled: !app.enabled)
            refresh()
        } catch {
            message = "Failed to toggle app: \(error)"
        }
    }

    func toggleSelected() {
        guard let app = selectedApp else { return }
        toggle(app)
    }

    func remove(_ app: AppAuthorization) {
        do {
            try service.delete(bundleID: app.bundleID)
            refresh()
        } catch {
            message = "Failed to remove app: \(error)"
        }
    }

    func removeSelected() {
        guard let app = selectedApp else { return }
        remove(app)
    }
}
