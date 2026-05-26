import BroverCore
import Foundation
import SwiftUI

struct RootView: View {
    @State private var selectedRoute: RootRoute? = .secrets
    @StateObject private var envListViewModel: EnvListViewModel
    @StateObject private var appsViewModel: AppsViewModel
    @State private var globalSearchText: String = ""

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
    }

    var body: some View {
        NavigationSplitView {
            ZStack {
                LinearGradient(
                    colors: [
                        Color(nsColor: NSColor(calibratedRed: 0.04, green: 0.06, blue: 0.10, alpha: 1.0)),
                        Color(nsColor: NSColor(calibratedRed: 0.10, green: 0.12, blue: 0.16, alpha: 1.0)),
                        Color(nsColor: NSColor(calibratedRed: 0.12, green: 0.13, blue: 0.14, alpha: 1.0))
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                    .ignoresSafeArea()

                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 14) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(Color.orange.opacity(0.12))
                                .frame(width: 34, height: 34)
                            Image(systemName: "shield.lefthalf.filled")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundStyle(Color.orange)
                        }

                        Text("Brover")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(.white)
                    }
                    .padding(.top, 38)
                    .padding(.horizontal, 18)

                    Text("Workspaces")
                        .font(.system(size: 12, weight: .bold))
                        .tracking(1.2)
                        .foregroundStyle(Color.white.opacity(0.34))
                        .padding(.top, 28)
                        .padding(.horizontal, 18)
                        .padding(.bottom, 10)

                    VStack(spacing: 8) {
                        ForEach(RootRoute.allCases) { route in
                            Button {
                                selectedRoute = route
                            } label: {
                                sidebarRow(for: route)
                            }
                            .buttonStyle(.plain)
                            .contentShape(Rectangle())
                            .frame(maxWidth: .infinity)
                        }
                    }
                    .padding(.horizontal, 12)

                    Spacer()
                }
            }
            .navigationTitle("")
        } content: {
            ZStack {
                LinearGradient(
                    colors: [
                        Color(nsColor: NSColor(calibratedRed: 0.03, green: 0.05, blue: 0.10, alpha: 1.0)),
                        Color(nsColor: NSColor(calibratedRed: 0.04, green: 0.06, blue: 0.09, alpha: 1.0))
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                VStack(spacing: 16) {
                    HStack(spacing: 12) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(Color.white.opacity(0.55))

                        TextField(searchPlaceholder, text: $globalSearchText)
                            .textFieldStyle(.plain)
                            .font(.system(size: 16, weight: .regular))
                            .foregroundStyle(.white)

                        Text("⌘F")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Color.white.opacity(0.55))
                    }
                    .padding(.horizontal, 16)
                    .frame(height: 56)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .strokeBorder(Color.white.opacity(0.14), lineWidth: 0.9)
                    )
                    .padding(.top, 18)
                    .padding(.horizontal, 12)

                    switch selectedRoute ?? .secrets {
                    case .apps:
                        AppsCenterListView(viewModel: appsViewModel, searchText: globalSearchText)
                    case .secrets:
                        SecretsCenterListView(viewModel: envListViewModel, searchText: globalSearchText)
                    }
                }
            }
        } detail: {
            switch selectedRoute ?? .secrets {
            case .apps:
                AppsDetailView(viewModel: appsViewModel)
            case .secrets:
                SecretsDetailView(viewModel: envListViewModel)
            }
        }
        .onChange(of: selectedRoute) { _, route in
            if route == .secrets {
                envListViewModel.refresh()
            }
        }
    }

    private var searchPlaceholder: String {
        switch selectedRoute ?? .secrets {
        case .apps:
            return "Search apps..."
        case .secrets:
            return "Search secrets..."
        }
    }

    private func sidebarRow(for route: RootRoute) -> some View {
        let isSelected = route == selectedRoute

        return HStack(spacing: 8) {
            sidebarIcon(for: route, selected: isSelected)
                .frame(width: 16, height: 16)

            Text(route.title)
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(isSelected ? .white : Color.white.opacity(0.82))

            Spacer()
        }
        .frame(minHeight: 38)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 12)
        .padding(.vertical, 0)
        .contentShape(Rectangle())
        .background(sidebarBackground(selected: isSelected))
        .overlay(sidebarBorder(selected: isSelected))
    }

    @ViewBuilder
    private func sidebarIcon(for route: RootRoute, selected: Bool) -> some View {
        if route == .apps {
            AppsSidebarIcon(color: selected ? .white : Color.orange)
        } else {
            Image(systemName: "key.fill")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(selected ? .white : Color.orange)
        }
    }

    private func sidebarBackground(selected: Bool) -> some View {
        RoundedRectangle(cornerRadius: 14, style: .continuous)
            .fill(selected ? Color.orange.opacity(0.88) : .clear)
    }

    private func sidebarBorder(selected: Bool) -> some View {
        RoundedRectangle(cornerRadius: 14, style: .continuous)
            .strokeBorder(selected ? Color.orange.opacity(0.95) : .clear, lineWidth: 0.8)
    }
}

private struct AppsSidebarIcon: View {
    let color: Color

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 3.5, style: .continuous)
                .stroke(color.opacity(0.9), lineWidth: 1.8)
                .frame(width: 11, height: 11)
                .offset(x: -2, y: 1)

            Path { path in
                path.move(to: CGPoint(x: 6.5, y: 3.5))
                path.addLine(to: CGPoint(x: 11, y: 3.5))
            }
            .stroke(color.opacity(0.9), style: StrokeStyle(lineWidth: 1.8, lineCap: .round))

            Circle()
                .fill(color.opacity(0.9))
                .frame(width: 4.6, height: 4.6)
                .offset(x: 4, y: -3)
        }
    }
}
