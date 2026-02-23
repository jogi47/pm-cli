class PmCli < Formula
  include Language::Node

  desc "Unified project management CLI"
  homepage "https://github.com/jogi47/pm-cli"
  url "https://registry.npmjs.org/@jogi47/pm-cli/-/pm-cli-0.2.3.tgz"
  sha256 "REPLACE_WITH_TARBALL_SHA256"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec/"bin/run.js" => "pm"
  end

  test do
    assert_match "pm", shell_output("#{bin}/pm --help")
  end
end
