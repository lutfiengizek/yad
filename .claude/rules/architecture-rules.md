# YAD Architecture Rules

## Project Directory Structure

```
yad/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands/          # Tauri command handlers (domain-based modules)
│   │   ├── db/                # SQLite & DB logic
│   │   ├── volume/            # Volume lifecycle, mount/unmount
│   │   ├── fs/                # File system operations
│   │   ├── models/            # Data structures & types
│   │   ├── error.rs           # Centralized AppError enum
│   │   └── state.rs           # App state definitions
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui primitives (auto-generated)
│   │   ├── sidebar/           # Left panel components
│   │   ├── content/           # Center panel components
│   │   ├── inspector/         # Right panel components
│   │   └── shared/            # Cross-panel shared components
│   ├── hooks/                 # Custom React hooks
│   ├── stores/                # Zustand stores
│   ├── lib/                   # Utility functions
│   ├── types/                 # TypeScript type definitions
│   ├── i18n/                  # Internationalization string files
│   ├── App.tsx
│   ├── main.tsx
│   └── globals.css
├── supabase/                  # Supabase migrations & config
├── docs/                      # Documentation (PRD, etc.)
├── tests/                     # Integration & E2E tests
└── .claude/rules/             # Claude Code rules
```

## Frontend-Backend Boundary

- **Frontend NEVER accesses the file system directly.** All file/folder operations go through Tauri commands (`invoke`).
- Frontend only handles UI rendering, user interaction, and state management.
- Rust backend is the single authority for: file operations, SQLite access, volume management, security checks, and RBAC enforcement.

## State Management

- Use **Zustand** for frontend state management.
- One store per domain: `useWorkspaceStore`, `useVolumeStore`, `useFileStore`, `useTagStore`, `usePersonStore`, etc.
- Stores call Tauri `invoke()` for data mutations; they do NOT directly mutate backend state.
- Keep stores flat and minimal. Derive computed values with selectors.

## MVP Phasing (PRD Section 17)

| Phase | Scope |
|-------|-------|
| **Phase 1** | Local archive: volume system, physical folders, tagging, person cards, ProseMirror notes, search, preview |
| **Phase 2** | Supabase Auth, workspace, RBAC, invites, registered computer system |
| **Phase 3** | WebRTC P2P sync, signaling, conflict resolution, viewer mode |
| **Phase 4** | Google Drive, `.yad` export/import, offline auth |
| **Phase 5** | Plugin system, MCP server |

- Do NOT implement features from later phases unless explicitly instructed.
- When in doubt about scope, ask before implementing.

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Rust variables, functions, modules | `snake_case` | `get_volume_metadata` |
| Rust types, enums, structs | `PascalCase` | `VolumeConfig`, `AppError` |
| TypeScript variables, functions | `camelCase` | `getVolumeMetadata` |
| TypeScript types, interfaces | `PascalCase` | `VolumeConfig` |
| React components | `PascalCase` | `FileGrid`, `SidebarNav` |
| CSS classes | `kebab-case` | `file-grid-container` |
| File names (TS/TSX) | `kebab-case` | `file-grid.tsx`, `use-volume.ts` |
| File names (Rust) | `snake_case` | `volume_manager.rs` |
| Tauri commands | `snake_case` | `#[tauri::command] fn list_files()` |
| Database columns | `snake_case` | `created_at`, `volume_id` |

## i18n Preparation

- All user-facing strings MUST be placed in separate files under `src/i18n/`.
- Never hardcode user-facing text directly in components.
- Use a key-based system (e.g., `t("sidebar.volumes")`) from the start.
- Initial language: Turkish (`tr`). English (`en`) will follow.
