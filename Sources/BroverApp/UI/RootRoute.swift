import Foundation

enum RootRoute: String, CaseIterable, Identifiable {
    case apps
    case profiles
    case secrets

    var id: String { rawValue }

    var title: String {
        switch self {
        case .apps:
            "Apps"
        case .profiles:
            "Profiles"
        case .secrets:
            "Secrets/Envs"
        }
    }
}
