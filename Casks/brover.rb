# frozen_string_literal: true

cask "brover" do
  arch arm: "arm64", intel: "x64"

  version "0.1.6"
  sha256 arm:   "c801499abf3f3123b5d4621ca874cd26abb16c94e5c681c9b3f9172c76451921",
         intel: "5a4582448317571fad84d4220eac97e396c2135e8a9537cf9af24c63a9015b49"

  url "https://github.com/eber404/brover/releases/download/v#{version}/Brover-#{version}-#{arch}.dmg"
  name "Brover"
  desc "Local environment secret manager"
  homepage "https://github.com/eber404/brover"

  app "Brover.app"

  zap trash: "~/Library/Application Support/brover"
end
