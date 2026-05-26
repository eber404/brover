import BroverCore
import SwiftUI

struct EnvListView: View {
    @ObservedObject var viewModel: EnvListViewModel

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Profile")
                Picker("Profile", selection: $viewModel.selectedProfile) {
                    ForEach(viewModel.profiles, id: \.name) { profile in
                        Text(profile.name).tag(profile.name)
                    }
                }
                .onChange(of: viewModel.selectedProfile) { _, _ in
                    viewModel.selectProfile(viewModel.selectedProfile)
                }
                Spacer()
                Button("Refresh") {
                    viewModel.refresh()
                }
            }

            GroupBox("Create Env") {
                VStack(spacing: 8) {
                    TextField(
                        "Name (e.g. OPENAI_API_KEY)",
                        text: Binding(
                            get: { viewModel.newName },
                            set: { viewModel.newName = viewModel.normalizeEnvNameInput($0) }
                        )
                    )
                    TextField("Secret value", text: $viewModel.newValue)
                    TextField("Description (optional)", text: $viewModel.newDescription)
                    HStack {
                        Spacer()
                        Button("Create") {
                            viewModel.createEnv()
                        }
                        .disabled(viewModel.newName.isEmpty || viewModel.newValue.isEmpty)
                    }
                }
            }
            .liquidGlassCard()

            List(viewModel.envs) { env in
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(env.name)
                            .font(.headline)
                        if let description = env.description, !description.isEmpty {
                            Text(description)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                    TextField("New secret value", text: $viewModel.editedValue)
                        .frame(width: 220)
                    Button("Edit") {
                        viewModel.updateValue(env)
                    }
                    Button("Reveal") {
                        viewModel.reveal(env)
                    }
                    Button("Copy") {
                        viewModel.copy(env)
                    }
                    Button("Delete", role: .destructive) {
                        viewModel.delete(env)
                    }
                }
                .padding(.vertical, 2)
            }
            .scrollContentBackground(.hidden)
            .liquidGlassCard()
        }
        .padding(16)
        .navigationTitle("Environment Variables")
        .alert("Info", isPresented: Binding(
            get: { viewModel.message != nil || viewModel.revealedValue != nil },
            set: { showing in
                if !showing {
                    viewModel.message = nil
                    viewModel.revealedValue = nil
                }
            }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            if let revealedValue = viewModel.revealedValue {
                Text("Secret: \(revealedValue)")
            } else {
                Text(viewModel.message ?? "")
            }
        }
    }
}
