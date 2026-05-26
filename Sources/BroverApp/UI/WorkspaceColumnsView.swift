import BroverCore
import SwiftUI

struct AppsCenterListView: View {
    @ObservedObject var viewModel: AppsViewModel
    let searchText: String

    private var filteredApps: [AppAuthorization] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return viewModel.apps }
        return viewModel.apps.filter {
            $0.displayName.localizedCaseInsensitiveContains(query) ||
            $0.bundleID.localizedCaseInsensitiveContains(query)
        }
    }

    var body: some View {
        VStack(spacing: 10) {
            HStack {
                Text("Apps")
                    .font(.title3.bold())
                Spacer()
                Button("Refresh") { viewModel.refresh() }
            }
            GroupBox("Add Authorized App") {
                VStack(spacing: 8) {
                    TextField("Display name", text: $viewModel.newDisplayName)
                    TextField("Bundle ID (e.g. com.apple.Terminal)", text: $viewModel.newBundleID)
                    HStack {
                        Spacer()
                        Button("Add") { viewModel.addApp() }
                            .disabled(viewModel.newDisplayName.isEmpty || viewModel.newBundleID.isEmpty)
                    }
                }
            }
            .liquidGlassCard()

            List(filteredApps, selection: $viewModel.selectedBundleID) { app in
                VStack(alignment: .leading, spacing: 4) {
                    Text(app.displayName).font(.headline)
                    Text(app.bundleID).font(.caption).foregroundStyle(.secondary)
                }
                .padding(.vertical, 2)
            }
            .scrollContentBackground(.hidden)
            .liquidGlassCard()
        }
        .padding(16)
    }
}

struct AppsDetailView: View {
    @ObservedObject var viewModel: AppsViewModel

    var body: some View {
        ZStack {
            VisualEffectView(material: .underWindowBackground, blendingMode: .behindWindow)
            if let app = viewModel.selectedApp {
                VStack(alignment: .leading, spacing: 14) {
                    Text(app.displayName).font(.largeTitle.bold())
                    Text(app.bundleID).foregroundStyle(.secondary)
                    Toggle("Enabled", isOn: Binding(
                        get: { app.enabled },
                        set: { _ in viewModel.toggleSelected() }
                    ))
                    HStack {
                        Button("Refresh") { viewModel.refresh() }
                        Button("Delete", role: .destructive) { viewModel.removeSelected() }
                    }
                    Spacer()
                }
                .padding(24)
            } else {
                ContentUnavailableView("No app selected", systemImage: "app.badge", description: Text("Select an app from the center list."))
            }
        }
    }
}

struct ProfilesCenterListView: View {
    @ObservedObject var viewModel: ProfilesViewModel

    var body: some View {
        VStack(spacing: 10) {
            HStack {
                Text("Profiles").font(.title3.bold())
                Spacer()
                Button("Refresh") { viewModel.refresh() }
            }
            GroupBox("Create Profile") {
                HStack {
                    TextField("Profile name", text: $viewModel.newProfileName)
                    Button("Create") { viewModel.createProfile() }
                }
            }
            .liquidGlassCard()

            List(viewModel.profiles, selection: $viewModel.selectedProfile) { profile in
                HStack {
                    Text(profile.name)
                    Spacer()
                    if profile.name == viewModel.activeProfile {
                        Text("Active").font(.caption2).foregroundStyle(.secondary)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .liquidGlassCard()
        }
        .padding(16)
        .onChange(of: viewModel.selectedProfile) { _, _ in
            if let profile = viewModel.profiles.first(where: { $0.name == viewModel.selectedProfile }) {
                viewModel.select(profile)
            }
        }
    }
}

struct ProfilesDetailView: View {
    @ObservedObject var viewModel: ProfilesViewModel

    var body: some View {
        ZStack {
            VisualEffectView(material: .underWindowBackground, blendingMode: .behindWindow)
            if !viewModel.selectedProfile.isEmpty {
                VStack(alignment: .leading, spacing: 14) {
                    Text(viewModel.selectedProfile).font(.largeTitle.bold())
                    if viewModel.selectedProfile == viewModel.activeProfile {
                        Text("Active profile").foregroundStyle(.secondary)
                    }
                    GroupBox("Rename") {
                        HStack {
                            TextField("New name", text: $viewModel.renameTarget)
                            Button("Rename") { viewModel.renameProfile() }
                        }
                    }
                    .liquidGlassCard()
                    HStack {
                        Button("Set Active") {
                            if let p = viewModel.profiles.first(where: { $0.name == viewModel.selectedProfile }) { viewModel.setActive(p) }
                        }
                        Button("Delete", role: .destructive) {
                            if let p = viewModel.profiles.first(where: { $0.name == viewModel.selectedProfile }) { viewModel.delete(p) }
                        }
                    }
                    Spacer()
                }
                .padding(24)
            } else {
                ContentUnavailableView("No profile selected", systemImage: "person.3", description: Text("Select a profile from the center list."))
            }
        }
    }
}

struct SecretsCenterListView: View {
    @ObservedObject var viewModel: EnvListViewModel
    let searchText: String
    @State private var showCreateModal = false

    private var filteredEnvs: [EnvMetadata] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return viewModel.envs }
        return viewModel.envs.filter {
            $0.name.localizedCaseInsensitiveContains(query) ||
            ($0.description ?? "").localizedCaseInsensitiveContains(query)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Secrets")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(.white)
                    Text("\(filteredEnvs.count) item\(filteredEnvs.count == 1 ? "" : "s")")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color.white.opacity(0.55))
                }
                Spacer()
                HStack(spacing: 10) {
                    glassToolbarButton(title: "Add Secret", systemImage: "plus", prominent: true) {
                        showCreateModal = true
                    }
                    glassToolbarButton(title: "Refresh", systemImage: "arrow.clockwise", prominent: false) {
                        viewModel.refresh()
                    }
                }
            }
            if filteredEnvs.isEmpty {
                VStack(spacing: 8) {
                    ContentUnavailableView(
                        searchText.isEmpty ? "No secrets yet" : "No matching secrets",
                        systemImage: "key",
                        description: Text(searchText.isEmpty ? "Create your first environment variable to start managing secrets." : "Try another search term.")
                    )
                    if searchText.isEmpty {
                        Button("Add first env") {
                            showCreateModal = true
                        }
                        .buttonStyle(.borderedProminent)
                        .padding(.top, 4)
                    }
                }
                .liquidGlassCard()
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 10) {
                        ForEach(filteredEnvs) { env in
                            HStack(spacing: 14) {
                                ZStack {
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .fill(Color.white.opacity(0.05))
                                        .frame(width: 52, height: 52)
                                    Image(systemName: "key.fill")
                                        .font(.system(size: 20, weight: .semibold))
                                        .foregroundStyle(viewModel.selectedEnvName == env.name ? Color.orange : Color.white.opacity(0.8))
                                }

                                VStack(alignment: .leading, spacing: 6) {
                                    Text(env.name)
                                        .font(.system(size: 18, weight: .bold))
                                        .foregroundStyle(.white)
                                    Text(relativeUpdatedText(for: env.updatedAt))
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundStyle(Color.white.opacity(0.58))
                                }

                                Spacer()

                                Text("Keychain")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(viewModel.selectedEnvName == env.name ? Color.orange : Color.white.opacity(0.72))
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(
                                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                                            .fill(Color.white.opacity(0.04))
                                    )

                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Color.white.opacity(0.60))
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 14)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .fill(viewModel.selectedEnvName == env.name ? Color.orange.opacity(0.18) : Color.white.opacity(0.03))
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .stroke(viewModel.selectedEnvName == env.name ? Color.orange.opacity(0.9) : Color.white.opacity(0.10), lineWidth: 1.0)
                            )
                            .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                            .onTapGesture {
                                viewModel.selectedEnvName = env.name
                            }
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
        .padding(20)
        .sheet(isPresented: $showCreateModal) {
            NavigationStack {
                VStack(spacing: 12) {
                    TextField(
                        "Name (e.g. OPENAI_API_KEY)",
                        text: Binding(
                            get: { viewModel.newName },
                            set: { viewModel.newName = viewModel.normalizeEnvNameInput($0) }
                        )
                    )
                    TextField("Secret value", text: $viewModel.newValue)
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Description (optional)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        TextEditor(text: $viewModel.newDescription)
                            .frame(minHeight: 88)
                            .padding(6)
                            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                    HStack {
                        Spacer()
                        Button("Cancel", role: .cancel) {
                            showCreateModal = false
                        }
                        Button("Create") {
                            let created = viewModel.createEnv()
                            if created {
                                showCreateModal = false
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(viewModel.newName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || viewModel.newValue.isEmpty)
                    }
                }
                .padding(20)
                .navigationTitle("Add Secret")
            }
            .frame(minWidth: 460, minHeight: 260)
        }
    }

    private func glassToolbarButton(title: String, systemImage: String, prominent: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: systemImage)
                Text(title)
            }
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 16)
            .frame(height: 40)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(prominent ? Color.orange.opacity(0.80) : Color.white.opacity(0.08))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(prominent ? Color.orange.opacity(0.95) : Color.white.opacity(0.12), lineWidth: 0.8)
            )
        }
        .buttonStyle(.plain)
    }

    private func relativeUpdatedText(for date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return "Updated " + formatter.localizedString(for: date, relativeTo: .now)
    }
}

struct SecretsDetailView: View {
    @ObservedObject var viewModel: EnvListViewModel

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color.white.opacity(0.05),
                    Color.white.opacity(0.02)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            if let env = viewModel.selectedEnv {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        Text(env.name)
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(.white)

                        HStack(spacing: 10) {
                            Image(systemName: "shield.lefthalf.filled")
                                .foregroundStyle(.green)
                            Text("Stored in login Keychain")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(Color.white.opacity(0.66))
                        }

                        VStack(alignment: .leading, spacing: 12) {
                            sectionTitle("SECRET VALUE")
                            HStack(spacing: 10) {
                                if let revealCountdownLabel = viewModel.revealCountdownLabel {
                                    Label(revealCountdownLabel, systemImage: "clock")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundStyle(Color.white.opacity(0.78))
                                        .padding(.horizontal, 14)
                                        .frame(height: 38)
                                        .background(.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                                .strokeBorder(Color.white.opacity(0.10), lineWidth: 0.8)
                                        )
                                }
                                Spacer()
                            }

                            VStack(alignment: .leading, spacing: 16) {
                                if let revealedValue = viewModel.revealedValue {
                                    Text(revealedValue)
                                        .font(.system(size: 18, weight: .medium, design: .monospaced))
                                        .foregroundStyle(.white)
                                } else {
                                    TextField("New secret value", text: $viewModel.editedValue)
                                        .textFieldStyle(.plain)
                                        .font(.system(size: 18, weight: .regular))
                                        .foregroundStyle(.white)
                                }

                                Rectangle()
                                    .fill(viewModel.revealedValue == nil ? Color.white.opacity(0.06) : Color.green.opacity(0.90))
                                    .frame(height: 3)
                                    .clipShape(Capsule())
                            }
                            .padding(16)
                            .frame(maxWidth: .infinity, minHeight: 108, alignment: .topLeading)
                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .strokeBorder(Color.white.opacity(0.10), lineWidth: 0.8)
                            )
                        }

                        HStack(spacing: 10) {
                            detailActionButton(title: "Edit", systemImage: "pencil", style: .accent) { viewModel.updateValue(env) }
                            if viewModel.revealedValue == nil {
                                detailActionButton(title: "Reveal", systemImage: "eye", style: .neutral) { viewModel.reveal(env) }
                            } else {
                                detailActionButton(title: "Hide", systemImage: "eye.slash", style: .neutral) { viewModel.hideReveal() }
                            }
                            detailActionButton(title: "Copy", systemImage: "doc.on.doc", style: .neutral) { viewModel.copy(env) }
                            detailActionButton(title: "Delete", systemImage: "trash", style: .danger) { viewModel.delete(env) }
                        }

                        VStack(alignment: .leading, spacing: 12) {
                            sectionTitle("METADATA")
                            VStack(alignment: .leading, spacing: 0) {
                                metadataRow(label: "Environment", value: "Local")
                                Divider().overlay(Color.white.opacity(0.08))
                                metadataRow(label: "Last Updated", value: formattedDate(env.updatedAt))
                                Divider().overlay(Color.white.opacity(0.08))
                                metadataRow(label: "Keychain", value: "Local")
                            }
                            .padding(16)
                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .strokeBorder(Color.white.opacity(0.10), lineWidth: 0.8)
                            )
                        }

                        VStack(alignment: .leading, spacing: 12) {
                            sectionTitle("NOTES")
                            HStack(alignment: .top, spacing: 10) {
                                Image(systemName: "lock")
                                    .foregroundStyle(Color.white.opacity(0.70))
                                Text("This secret is encrypted and stored securely in your macOS Keychain.")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(Color.white.opacity(0.70))
                            }
                            .padding(16)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .strokeBorder(Color.white.opacity(0.10), lineWidth: 0.8)
                            )
                        }

                        if let description = env.description, !description.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                sectionTitle("DESCRIPTION")
                                Text(description)
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundStyle(Color.white.opacity(0.78))
                                    .padding(16)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                                            .strokeBorder(Color.white.opacity(0.10), lineWidth: 0.8)
                                    )
                            }
                        }

                        Spacer(minLength: 20)
                    }
                    .padding(24)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .strokeBorder(Color.white.opacity(0.10), lineWidth: 0.9)
                    )
                    .padding(20)
                }
            } else {
                ContentUnavailableView("No env selected", systemImage: "key", description: Text("Select an env from the center list."))
            }
        }
        .ignoresSafeArea(edges: .top)
    }

    private func sectionTitle(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 13, weight: .bold))
            .tracking(1.0)
            .foregroundStyle(Color.white.opacity(0.42))
    }

    private func metadataRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Color.white.opacity(0.78))
            Spacer()
            Text(value)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Color.white.opacity(0.64))
        }
        .padding(.vertical, 14)
    }

    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }

    private func detailActionButton(title: String, systemImage: String, style: DetailActionButtonStyle, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: systemImage)
                Text(title)
            }
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .frame(height: 44)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(style.fill)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(style.stroke, lineWidth: 0.8)
            )
        }
        .buttonStyle(.plain)
    }
}

private enum DetailActionButtonStyle {
    case accent
    case neutral
    case danger

    var fill: Color {
        switch self {
        case .accent: return Color.orange.opacity(0.82)
        case .neutral: return Color.white.opacity(0.06)
        case .danger: return Color.red.opacity(0.22)
        }
    }

    var stroke: Color {
        switch self {
        case .accent: return Color.orange.opacity(0.92)
        case .neutral: return Color.white.opacity(0.12)
        case .danger: return Color.red.opacity(0.40)
        }
    }
}
