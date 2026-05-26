import Foundation

public final class JSONAppAuthorizationStore: AppAuthorizationService, @unchecked Sendable {
    private struct State: Codable {
        var apps: [String: AppAuthorization]
    }

    private let fileURL: URL
    private let lock = NSLock()

    public init(fileURL: URL) {
        self.fileURL = fileURL
    }

    public func list() -> [AppAuthorization] {
        lock.withLock {
            loadState().apps.values.sorted(by: { $0.displayName < $1.displayName })
        }
    }

    public func create(_ app: AppAuthorization) throws {
        guard BundleIDValidator.isValid(app.bundleID) else {
            throw AppAuthorizationError.invalidBundleID
        }
        try lock.withLock {
            var state = loadState()
            guard state.apps[app.bundleID] == nil else {
                throw AppAuthorizationError.duplicateBundleID
            }
            state.apps[app.bundleID] = app
            saveState(state)
        }
    }

    public func setEnabled(bundleID: String, enabled: Bool) throws {
        try lock.withLock {
            var state = loadState()
            guard var app = state.apps[bundleID] else {
                throw AppAuthorizationError.notFound
            }
            app.enabled = enabled
            app.updatedAt = Date()
            state.apps[bundleID] = app
            saveState(state)
        }
    }

    public func delete(bundleID: String) throws {
        try lock.withLock {
            var state = loadState()
            guard state.apps.removeValue(forKey: bundleID) != nil else {
                throw AppAuthorizationError.notFound
            }
            saveState(state)
        }
    }

    private func loadState() -> State {
        guard let data = try? Data(contentsOf: fileURL),
              let state = try? JSONDecoder().decode(State.self, from: data)
        else {
            return State(apps: [:])
        }
        return state
    }

    private func saveState(_ state: State) {
        let directory = fileURL.deletingLastPathComponent()
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let data = try? encoder.encode(state) else { return }
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
