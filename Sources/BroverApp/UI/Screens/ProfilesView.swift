import BroverCore
import SwiftUI

struct ProfilesView: View {
    let profiles: [Profile]

    var body: some View {
        List(profiles) { profile in
            Text(profile.name)
        }
        .navigationTitle("Profiles")
    }
}
