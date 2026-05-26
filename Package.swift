// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "brover",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "BroverApp", targets: ["BroverApp"]),
        .library(name: "BroverCore", targets: ["BroverCore"])
    ],
    targets: [
        .target(
            name: "BroverCore"
        ),
        .executableTarget(
            name: "BroverApp",
            dependencies: ["BroverCore"]
        ),
        .testTarget(
            name: "BroverCoreTests",
            dependencies: ["BroverCore"]
        ),
        .testTarget(
            name: "BroverAppTests",
            dependencies: ["BroverApp", "BroverCore"]
        )
    ]
)
