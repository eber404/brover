import BroverCore
import SwiftUI

struct ProfilesView: View {
    @ObservedObject var viewModel: ProfilesViewModel

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Profiles")
                        .font(.title2.bold())
                    Text("Manage profile lifecycle and active selection")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button("Refresh") {
                    viewModel.refresh()
                }
            }

            GroupBox("Create Profile") {
                HStack {
                    TextField("Profile name", text: $viewModel.newProfileName)
                    Button("Create") {
                        viewModel.createProfile()
                    }
                    .disabled(viewModel.newProfileName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .liquidGlassCard()

            GroupBox("Rename Profile") {
                HStack {
                    Picker("From", selection: $viewModel.renameSource) {
                        ForEach(viewModel.profiles, id: \.name) { profile in
                            Text(profile.name).tag(profile.name)
                        }
                    }
                    TextField("New name", text: $viewModel.renameTarget)
                    Button("Rename") {
                        viewModel.renameProfile()
                    }
                    .disabled(viewModel.renameSource.isEmpty || viewModel.renameTarget.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .liquidGlassCard()

            List(viewModel.profiles) { profile in
                HStack {
                    Text(profile.name)
                        .font(.headline)
                    if profile.name == viewModel.activeProfile {
                        Text("Active")
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(.regularMaterial, in: Capsule())
                    }
                    Spacer()
                    Button("Set Active") {
                        viewModel.setActive(profile)
                    }
                    .disabled(profile.name == viewModel.activeProfile)
                    Button("Delete", role: .destructive) {
                        viewModel.delete(profile)
                    }
                }
                .padding(.vertical, 2)
            }
            .scrollContentBackground(.hidden)
            .liquidGlassCard()
        }
        .padding(16)
        .navigationTitle("Profiles")
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
