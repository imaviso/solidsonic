# SolidSonic

SolidSonic is a modern, high-performance desktop music player for Subsonic and OpenSubsonic-compatible servers. Built with **SolidJS** and **Electron**, it offers a snappy, reactive user experience combined with the power of the **MPV** audio backend.

## ✨ Features

- **Subsonic/OpenSubsonic Integration**: Full support for your favorite music server backends.
- **High-Performance Audio**: Utilizes `node-mpv` for robust and high-quality audio playback.
- **Reactive UI**: A sleek, modern interface built with SolidJS and Tailwind CSS.
- **MPRIS Support**: Seamless integration with Linux desktop media controls.
- **Advanced State Management**: Powered by TanStack Query for efficient data fetching and caching.
- **File-Based Routing**: Clean and predictable navigation via TanStack Router.
- **Cross-Platform**: Ready for Windows, macOS, and Linux.

## 🚀 Tech Stack

- **Frontend**: [SolidJS](https://www.solidjs.com/)
- **Desktop Framework**: [Electron](https://www.electronjs.org/)
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Audio Backend**: [MPV](https://mpv.io/) (via `node-mpv`)
- **Linting/Formatting**: [Biome](https://biomejs.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)

## ❄️ Nix Support

This project includes a [Nix Flake](https://nixos.wiki/wiki/Flakes) for reproducible development environments and packaging.

### Development Shell

If you have Nix installed with flakes enabled, you can enter a pre-configured development environment with all dependencies (Node.js, Bun, MPV, Electron, etc.) ready to go:

```bash
nix develop
```

### Packaging

To build the SolidSonic package using Nix:

```bash
nix build
```

The resulting binary will be available in `./result/bin/solidsonic`.

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (latest LTS recommended)
- [Bun](https://bun.sh/) (preferred for dependency management)
- **MPV**: Ensure `mpv` is installed on your system and available in your PATH.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/imaviso/solidsonic.git
   cd solidsonic
   ```

2. Install dependencies:
   ```bash
   bun install
   # or
   npm install
   ```

### Development

Start the development server with Hot Module Replacement (HMR) and Electron:

```bash
npm run electron:dev
```

### Building

To package the application for your current platform:

```bash
npm run electron:build
```

Build for specific platforms:
- `npm run electron:build:win`
- `npm run electron:build:mac`
- `npm run electron:build:linux`

## 🧪 Testing & Quality

- **Run tests**: `npm run test`
- **Lint & Format**: `npm run check`
- **Fix formatting**: `npm run format`

## 📂 Project Structure

- `electron/`: Main process logic, MPRIS integration, and preload scripts.
- `src/`: Renderer process (SolidJS application).
  - `src/components/`: Reusable UI components.
  - `src/lib/`: Core logic (API, Player, Auth, Settings).
  - `src/routes/`: File-based route definitions.
  - `src/hooks/`: Custom SolidJS primitives.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
