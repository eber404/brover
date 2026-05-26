import BroverCore
import SwiftUI

struct AppsView: View {
    @ObservedObject var viewModel: AppsViewModel

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Apps")
                        .font(.title2.bold())
                    Text("Allowlist of apps authorized for runtime env injection")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button("Refresh") {
                    viewModel.refresh()
                }
            }

            GroupBox("Add Authorized App") {
                VStack(spacing: 8) {
                    TextField("Display name", text: $viewModel.newDisplayName)
                    TextField("Bundle ID (e.g. com.apple.Terminal)", text: $viewModel.newBundleID)
                    HStack {
                        Spacer()
                        Button("Add App") {
                            viewModel.addApp()
                        }
                        .disabled(viewModel.newDisplayName.isEmpty || viewModel.newBundleID.isEmpty)
                    }
                }
            }

            if viewModel.apps.isEmpty {
                ContentUnavailableView(
                    "No apps authorized yet",
                    systemImage: "app.badge",
                    description: Text("Add an app to allow runtime env injection requests.")
                )
            } else {
                List(viewModel.apps) { app in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(app.displayName)
                                .font(.headline)
                            Text(app.bundleID)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Toggle("Enabled", isOn: Binding(
                            get: { app.enabled },
                            set: { _ in viewModel.toggle(app) }
                        ))
                        .labelsHidden()
                        Button("Remove", role: .destructive) {
                            viewModel.remove(app)
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
        .padding(16)
        .alert("Info", isPresented: Binding(
            get: { viewModel.message != nil },
            set: { if !$0 { viewModel.message = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.message ?? "")
        }
    }
}
