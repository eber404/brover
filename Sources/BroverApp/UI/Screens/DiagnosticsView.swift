import SwiftUI

struct DiagnosticsView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Diagnostics")
                .font(.title2.bold())
            Text("Native app bootstrap complete.")
            Text("Next phase: Keychain integration, auth gates, and metadata persistence.")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(20)
    }
}
