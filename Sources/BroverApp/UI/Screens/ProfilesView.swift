import BroverCore
import SwiftUI

struct ProfilesView: View {
    @ObservedObject var viewModel: ProfilesViewModel

    var body: some View {
        VStack(spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Profiles")
                        .font(.title3.bold())
                    Text("Choose active runtime context")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button {
                    viewModel.newProfileName = ""
                } label: {
                    Image(systemName: "plus")
                        .font(.title3.weight(.semibold))
                        .padding(8)
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
            }
            .padding(.horizontal, 2)

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

            GroupBox("Rename Selected") {
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

            VStack(alignment: .leading, spacing: 10) {
                ForEach(viewModel.profiles) { profile in
                    Button {
                        viewModel.select(profile)
                    } label: {
                        HStack(spacing: 12) {
                            Circle()
                                .fill(dotColor(for: profile.name))
                                .frame(width: 10, height: 10)
                            Text(profile.name)
                                .font(.headline)
                                .foregroundStyle(.primary)
                            Spacer()
                            if profile.name == viewModel.activeProfile {
                                Text("Active")
                                    .font(.caption2.weight(.semibold))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(.regularMaterial, in: Capsule())
                            }
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .frame(maxWidth: .infinity)
                        .background(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(viewModel.selectedProfile == profile.name ? Color.white.opacity(0.16) : Color.clear)
                        )
                    }
                    .buttonStyle(.plain)

                    HStack(spacing: 10) {
                        Button("Set Active") { viewModel.setActive(profile) }
                            .disabled(profile.name == viewModel.activeProfile)
                        Button("Delete", role: .destructive) { viewModel.delete(profile) }
                    }
                    .font(.caption)
                    .padding(.leading, 36)
                }
            }
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

    private func dotColor(for profile: String) -> Color {
        let palette: [Color] = [.pink, .orange, .green, .yellow, .blue, .mint, .teal]
        let idx = abs(profile.hashValue) % palette.count
        return palette[idx]
    }
}
