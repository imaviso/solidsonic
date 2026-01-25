# Agentic Guidelines for SolidSonic

This document provides essential information for AI agents working on the SolidSonic codebase. SolidSonic is a music player built with SolidJS, TanStack Router/Query, and Electron.

## 🛠 Commands

### Development & Build
- `npm run dev`: Start Vite development server (port 3000).
- `npm run electron:dev`: Run Vite and Electron concurrently (main development command).
- `npm run build`: Build the frontend (Vite) and run type checking.
- `npm run electron:build`: Build the app for the current platform using electron-builder.

### Linting & Formatting
This project uses **Biome** for linting and formatting.
- `npm run lint`: Run Biome linter.
- `npm run format`: Run Biome formatter.
- `npm run check`: Run both linting and formatting checks.

### Testing
This project uses **Vitest**.
- `npm run test`: Run all tests.
- `npx vitest run <path-to-file>`: Run a specific test file.
- `npx vitest run -t '<test-name-pattern>'`: Run tests matching a specific name.

---

## 🏗 Architecture & Conventions

### Directory Structure
- `electron/`: Main process and preload scripts.
- `src/`: Renderer process (SolidJS).
  - `src/components/ui/`: UI components (shadcn-like).
  - `src/lib/`: Core logic (API, Auth, Player).
  - `src/routes/`: TanStack Router file-based routing.
  - `src/hooks/`: Custom SolidJS primitives/hooks.

### Technology Stack
- **Framework**: SolidJS
- **Routing**: TanStack Router (File-based)
- **Data Fetching**: TanStack Query
- **Styling**: Tailwind CSS
- **Desktop**: Electron
- **Linter/Formatter**: Biome

---

## 📝 Code Style Guidelines

### Formatting
- **Indentation**: Tabs (per `biome.json`).
- **Quotes**: Double quotes for strings.
- **Semicolons**: Always used.

### TypeScript & Types
- **Strict Mode**: Enabled. Avoid `any` at all costs.
- **Data Models**: Prefer `interface` for data structures (e.g., `Song`, `Album`).
- **Path Aliases**: Use `~/` for imports from the `src/` directory (e.g., `import { ... } from "~/lib/auth"`).
- **API Types**: Use `SubsonicResponse<T>` for wrapping Subsonic API responses.

### Reactivity (SolidJS)
- Use `createStore` for complex or global state (see `src/lib/auth.ts`).
- Use `createSignal` for simple local state.
- Use `createMemo` for derived values.
- **Props**: Destructure props using `splitProps` or access them directly to maintain reactivity. Do not destructure props in the function signature.

### API & Error Handling
- **Subsonic API**: All API calls should go through `fetchSubsonic` or `createApiRequest` in `src/lib/subsonic.ts`.
- **Authentication**: Use headers (`X-Subsonic-Token`, etc.) for API calls. Use query parameters only for media URLs (`stream`, `getCoverArt`).
- **Errors**: Throw descriptive `Error` objects. API functions should extract error messages from the Subsonic `error` object in the response.

### Component Naming
- Components: PascalCase (e.g., `AppSidebar.tsx`).
- Functions/Variables: camelCase.
- Constants: SCREAMING_SNAKE_CASE.

### Secure Storage
- Sensitive data (passwords) must **never** be stored in `localStorage`.
- Use the IPC bridge `window.electronAPI.auth` to interact with Electron's `safeStorage`.

### Styling
- **Tailwind CSS**: Use Tailwind classes for all styling.
- **Icons**: Use `@tabler/icons-solidjs`. Note: if the linter/LSP reports "Cannot find module", it may be an environment issue; verify in `package.json` first.
- **UI Components**: Check `src/components/ui/` for existing accessible components before building new ones.

---

## 🧩 Common Patterns

### Data Fetching (TanStack Query)
```typescript
const query = createQuery(() => ({
	queryKey: ["albums", type()],
	queryFn: () => getAlbumList(type()),
}));
```

### Routing (TanStack Router)
- Define routes in `src/routes/` using file-based routing.
- Use `useNavigate` for programmatic navigation and `A` for links.

### Player State
- Managed via `src/lib/player.ts`.
- The `Player` component in `src/components/Player.tsx` is the primary consumer.

---

## 🚦 Testing Guidelines
- Place tests in the same directory as the file being tested or in a `__tests__` folder.
- Follow the `filename.test.ts` or `filename.test.tsx` naming convention.
- Use `vi.mock` for mocking Electron IPC or external API calls.

---

## ⚠️ Important Reminders
- **CORS**: The app runs in a browser environment (Electron Renderer). The Subsonic server must have CORS enabled, or requests must be proxied.
- **Reactivity**: Remember that SolidJS reactivity is lost if you destructure signals or props too early. Always access props like `props.data` or use `splitProps`.
- **Main vs Renderer**: Only the Main process (`electron/`) has access to Node.js APIs (fs, path, safeStorage). The Renderer (`src/`) must use the `preload.cjs` bridge (`window.electronAPI`).
- **Media URLs**: When generating URLs for `<audio>` or `<img>`, use `buildMediaUrl` as it handles token/salt generation in the query string.
