import Foundation

enum RootRoute: String, CaseIterable, Identifiable {
    case apps
    case secrets

    var id: String { rawValue }

    var title: String {
        switch self {
        case .apps:
            "Apps"
        case .secrets:
            "Secrets"
        }
    }
}
