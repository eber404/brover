import Foundation

public enum BundleIDValidator {
    private static let regex = try? NSRegularExpression(pattern: "^[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)+$")

    public static func isValid(_ bundleID: String) -> Bool {
        guard !bundleID.isEmpty, let regex else { return false }
        let range = NSRange(bundleID.startIndex..<bundleID.endIndex, in: bundleID)
        return regex.firstMatch(in: bundleID, options: [], range: range) != nil
    }
}
