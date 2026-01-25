{
  description = "SolidSonic - A music player for Subsonic/OpenSubsonic servers";

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

        # Runtime dependencies for Electron
        runtimeDeps = with pkgs; [
          glib
          libgbm
          libGL
          nss
          nspr
          atk
          cups
          dbus
          libdrm
          gtk3
          pango
          cairo
          xorg.libX11
          xorg.libXcomposite
          xorg.libXdamage
          xorg.libXext
          xorg.libXfixes
          xorg.libXrandr
          xorg.libxcb
          mesa
          expat
          alsa-lib
          at-spi2-atk
          at-spi2-core
          libxkbcommon
          xorg.libxshmfence
        ];

        runtimeLibPath = pkgs.lib.makeLibraryPath runtimeDeps;

        # Build the frontend assets
        frontendBuild = pkgs.buildNpmPackage {
          pname = "solidsonic-frontend";
          version = "0.1.0";

          src = ./.;

          npmDepsHash = "sha256-lbjwvXPA4qOTen+SN3kvfManWndgaHbKGGYTudGggIE=";

          # Handle git dependencies and cache issues
          makeCacheWritable = true;
          npmFlags = ["--legacy-peer-deps" "--ignore-scripts" "--prefer-offline"];

          nativeBuildInputs = with pkgs; [
            nodejs
            python3 # Required for node-gyp
            pkg-config
          ];

          # Skip npm build, we do it manually
          dontNpmBuild = true;

          # Skip electron binary download
          ELECTRON_SKIP_BINARY_DOWNLOAD = "1";

          buildPhase = ''
            runHook preBuild
            npm run build
            runHook postBuild
          '';

          installPhase = ''
            runHook preInstall
            mkdir -p $out
            cp -r dist $out/
            cp -r electron $out/
            cp package.json $out/
            cp -r node_modules $out/
            runHook postInstall
          '';
        };

        solidsonic = pkgs.stdenv.mkDerivation {
          pname = "solidsonic";
          version = "0.1.0";

          src = frontendBuild;
          dontUnpack = true;

          nativeBuildInputs = with pkgs; [makeWrapper];
          buildInputs = runtimeDeps;

          installPhase = ''
                        mkdir -p $out/lib/solidsonic
                        mkdir -p $out/bin
                        mkdir -p $out/share/applications
                        mkdir -p $out/share/icons/hicolor/scalable/apps

                        # Copy from frontend build
                        cp -r $src/* $out/lib/solidsonic/

                        # Copy icon from source
                        cp ${./public/extension_icon.svg} $out/share/icons/hicolor/scalable/apps/solidsonic.svg

                        # Create desktop entry
                        cat > $out/share/applications/solidsonic.desktop << EOF
            [Desktop Entry]
            Name=SolidSonic
            Comment=Music player for Subsonic/OpenSubsonic servers
            Exec=solidsonic
            Icon=solidsonic
            Terminal=false
            Type=Application
            Categories=Audio;Music;Player;
            EOF

                        # Create wrapper script
                        makeWrapper ${pkgs.electron}/bin/electron $out/bin/solidsonic \
                          --add-flags "$out/lib/solidsonic" \
                          --prefix PATH : ${pkgs.lib.makeBinPath [pkgs.mpv]} \
                          --prefix LD_LIBRARY_PATH : "${runtimeLibPath}"
          '';

          meta = with pkgs.lib; {
            description = "SolidSonic - A music player for Subsonic/OpenSubsonic servers";
            license = licenses.mit;
            platforms = platforms.linux;
            mainProgram = "solidsonic";
          };
        };
      in {
        packages = {
          default = solidsonic;
          solidsonic = solidsonic;
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            nodejs
            # Electron dependencies
            electron
            # MPV for audio backend
            mpv
            # MPRIS testing
            playerctl
            # Required for native module compilation (mpris-service)
            python3
            pkg-config
            # Required for electron-builder
            dpkg
            fakeroot
            ruby
            fpm
            glib
          ];

          # Electron runtime dependencies
          LD_LIBRARY_PATH = runtimeLibPath;
        };
      }
    );
}
