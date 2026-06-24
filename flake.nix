{
  description = "Zero-knowledge file encryption web app";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };
        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" "clippy" "rustfmt" ];
          targets = [ "wasm32-unknown-unknown" ];
        };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            rustToolchain
            wasm-pack
            nodejs_24
          ];

          shellHook = ''
            export NEXT_TELEMETRY_DISABLED=1
            export NPM_CONFIG_FUND=false
            export NPM_CONFIG_AUDIT=false
            export NPM_CONFIG_UPDATE_NOTIFIER=false
          '';
        };

        apps = {
          default = {
            type = "app";
            program = "${pkgs.writeShellScriptBin "run-dev" ''
              export PATH=${pkgs.nodejs_24}/bin:${pkgs.wasm-pack}/bin:${rustToolchain}/bin:$PATH
              export NEXT_TELEMETRY_DISABLED=1
              npm install
              npm run dev
            ''}/bin/run-dev";
          };
          build = {
            type = "app";
            program = "${pkgs.writeShellScriptBin "run-build" ''
              export PATH=${pkgs.nodejs_24}/bin:${pkgs.wasm-pack}/bin:${rustToolchain}/bin:$PATH
              export NEXT_TELEMETRY_DISABLED=1
              npm install
              npm run build
            ''}/bin/run-build";
          };
        };
      }
    );
}
