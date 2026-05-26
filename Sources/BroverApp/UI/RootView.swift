import BroverCore
import Foundation
import SwiftUI

struct RootView: View {
    @StateObject private var envListViewModel: EnvListViewModel

    init() {
        let configURL = FileManager.default
            .homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/brover/config.json")
        let manager = EnvManager(
            envService: JSONProfileStore(fileURL: configURL),
            keychainService: NativeKeychainService(),
            authGate: MacOSAuthGate()
        )
        _envListViewModel = StateObject(wrappedValue: EnvListViewModel(manager: manager))
    }

    var body: some View {
        NavigationSplitView {
            List {
                NavigationLink("Env List") {
                    EnvListView(viewModel: envListViewModel)
                }
                NavigationLink("Profiles") {
                    ProfilesView(profiles: envListViewModel.profiles)
                }
                NavigationLink("Diagnostics") {
                    DiagnosticsView()
                }
            }
            .navigationTitle("brover")
        } detail: {
            ZStack {
                VisualEffectView(material: .hudWindow, blendingMode: .behindWindow)
                VStack(alignment: .leading, spacing: 12) {
                    Text("brover")
                        .font(.largeTitle.bold())
                    Text("Native macOS env manager")
                        .foregroundStyle(.secondary)
                    Text("Select an item from sidebar.")
                }
                .padding(24)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
    }
}
