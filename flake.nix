{
  description = "SolidSonic - A web music player for Subsonic/OpenSubsonic servers";

  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = {
    self,
    flake-utils,
    nixpkgs,
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};

        solidsonic-web = pkgs.buildNpmPackage {
          pname = "solidsonic-web";
          version = "0.1.0";
          src = ./.;

          npmDepsHash = "sha256-o1jhELA7w8ZMCz0e8w9jiLY0RjH0xhdSvKlQdYbfzFk=";

          makeCacheWritable = true;
          npmFlags = ["--legacy-peer-deps" "--ignore-scripts" "--prefer-offline"];

          nativeBuildInputs = with pkgs; [
            nodejs
            python3
            pkg-config
          ];

          buildPhase = ''
            runHook preBuild
            npm run build
            runHook postBuild
          '';

          installPhase = ''
            runHook preInstall
            mkdir -p $out
            cp -r dist $out/
            runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "SolidSonic static web build";
            license = licenses.mit;
            platforms = platforms.all;
          };
        };
      in {
        packages = {
          default = solidsonic-web;
          solidsonic-web = solidsonic-web;
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            nodejs
            python3
            pkg-config
          ];
        };
      }
    );
}
