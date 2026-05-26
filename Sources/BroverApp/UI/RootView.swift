import BroverCore
import Foundation
import SwiftUI

struct RootView: View {
    @State private var selectedRoute: RootRoute? = .secrets
    @StateObject private var envListViewModel: EnvListViewModel
    @StateObject private var appsViewModel: AppsViewModel
    @StateObject private var profilesViewModel: ProfilesViewModel

    init() {
        let configURL = FileManager.default
            .homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/brover/config.json")
        let manager = EnvManager(
            envService: JSONProfileStore(fileURL: configURL),
            keychainService: NativeKeychainService(),
            authGate: MacOSAuthGate()
        )
        let appsURL = FileManager.default
            .homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/brover/apps.json")
        _envListViewModel = StateObject(wrappedValue: EnvListViewModel(manager: manager))
        _appsViewModel = StateObject(wrappedValue: AppsViewModel(service: JSONAppAuthorizationStore(fileURL: appsURL)))
        _profilesViewModel = StateObject(wrappedValue: ProfilesViewModel(manager: manager))
    }

    var body: some View {
        NavigationSplitView {
            List(RootRoute.allCases, selection: $selectedRoute) { route in
                Text(route.title)
                    .tag(route)
            }
            .navigationTitle("brover")
        } detail: {
            switch selectedRoute ?? .secrets {
            case .apps:
                AppsView(viewModel: appsViewModel)
            case .profiles:
                ProfilesView(viewModel: profilesViewModel)
            case .secrets:
                ZStack {
                    VisualEffectView(material: .hudWindow, blendingMode: .behindWindow)
                    EnvListView(viewModel: envListViewModel)
                }
            }
        }
        .onChange(of: selectedRoute) { _, route in
            if route == .profiles {
                profilesViewModel.refresh()
            }
            if route == .secrets {
                envListViewModel.refresh()
            }
        }
    }
}
