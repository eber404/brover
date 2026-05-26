import Foundation

public enum EnvNameValidator {
    private static let regex = try? NSRegularExpression(pattern: "^[A-Za-z_][A-Za-z0-9_]*$")

    public static func isValid(_ name: String) -> Bool {
        guard !name.isEmpty, let regex else { return false }
        let range = NSRange(name.startIndex..<name.endIndex, in: name)
        return regex.firstMatch(in: name, options: [], range: range) != nil
    }
}
