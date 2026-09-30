# Homebrew Main Repository Design

## Goal

Remove the dedicated `eber404/homebrew-brover` tap while keeping Homebrew installation available from the public `eber404/brover` repository.

## Selected Approach

Store `Casks/brover.rb` in `eber404/brover`. The cask downloads DMGs from the public release of that same repository. The release workflow publishes the DMGs and updates the local cask after each `v*` tag.

The existing `v0.1.6` public release already contains matching arm64 and x64 DMGs, so its cask can move without recreating artifacts.

## User Installation

```sh
brew tap eber404/brover https://github.com/eber404/brover && brew install --cask brover
```

## Migration Order

1. Add and audit the cask in the main repository.
2. Remove cross-repository release and cask updates from the release workflow.
3. Update public documentation and project distribution notes.
4. Push the migration to `main`.
5. Delete `eber404/homebrew-brover` only after the main repository holds the cask.
