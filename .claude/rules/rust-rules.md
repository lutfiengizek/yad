---
paths:
  - "src-tauri/**/*.rs"
  - "src-tauri/Cargo.toml"
---

# YAD Rust Rules

## Tauri v2 Command Structure

- All frontend-callable functions use `#[tauri::command]` attribute.
- Organize commands by domain in separate modules under `src-tauri/src/commands/`:
  - `commands/volume.rs` — Volume mount/unmount/list
  - `commands/files.rs` — File CRUD, move, copy, delete
  - `commands/tags.rs` — Tag operations
  - `commands/persons.rs` — Person card operations
  - `commands/search.rs` — FTS5 search
  - `commands/notes.rs` — Note operations
- Register commands in `main.rs` or `lib.rs` via `tauri::Builder::invoke_handler`.

## State Management

- Use `tauri::State<>` to inject shared state into commands.
- Wrap mutable shared state in `Arc<Mutex<>>` or `Arc<RwLock<>>`:
  - `RwLock` for read-heavy data (volume metadata, config)
  - `Mutex` for write-heavy data (active file locks)
- Never hold locks across `.await` points. Clone data out of the lock, then operate on the clone.

## Physical Mapping Principle

> Every file/folder operation in YAD must have an exact physical counterpart on the filesystem.

- Creating a folder in the UI = `std::fs::create_dir` on disk + DB record insert
- Moving a file = `std::fs::rename` (or copy+delete across volumes) + DB update
- Both filesystem and DB operations MUST be atomic: if one fails, the other is rolled back.
- No virtual folders, no symlinks, no cross-references.

## Soft Delete

- Deleting a file moves it to `.trash/` under the volume root (not permanent deletion).
- `.trash/` entries carry metadata: original path, deletion timestamp, deleted-by user ID.
- Trash auto-purge after 30 days (configurable).

## Volume Lifecycle

- Detect mount/unmount via OS events (platform-specific: Windows `WMI`/`DeviceNotification`, macOS `DiskArbitration`).
- On mount: cascade recognition (check `.yad/` → read `volume-id.json` → validate disk UUID → background integrity check).
- Use Tauri event system (`app.emit()`) to notify frontend of volume status changes.
- Events: `volume:mounted`, `volume:unmounted`, `volume:error`, `volume:integrity-warning`.

## Error Handling

- Define a centralized `AppError` enum in `src-tauri/src/error.rs`.
- Derive `thiserror::Error` + `serde::Serialize` on `AppError`.
- All Tauri commands return `Result<T, AppError>`.
- Error variants by domain:
  - `Io(String)` — filesystem errors
  - `Db(String)` — SQLite errors
  - `VolumeNotFound(String)` — missing volume
  - `VolumeLocked(String)` — volume busy
  - `PermissionDenied(String)` — RBAC violation
  - `PathTraversal(String)` — security violation
  - `InvalidInput(String)` — validation errors
  - `Internal(String)` — unexpected errors

```rust
#[derive(Debug, thiserror::Error, serde::Serialize)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(String),
    #[error("Database error: {0}")]
    Db(String),
    // ... etc
}
```

## Security

- **RBAC decisions are made exclusively on the Rust side.** Frontend only reflects permissions in the UI; it never enforces them.
- **Path traversal protection:** Validate and canonicalize all paths. Reject any path containing `..` or resolving outside the volume root.
- Sanitize all user-provided filenames (strip control characters, limit length, reject reserved names).
- Never expose absolute system paths to the frontend; use volume-relative paths.

## Recommended Crates

| Crate | Purpose |
|-------|---------|
| `rusqlite` | SQLite access |
| `r2d2` | Connection pooling |
| `serde` / `serde_json` | Serialization |
| `tokio` | Async runtime |
| `notify` | Filesystem watcher |
| `blake3` | Fast file hashing |
| `uuid` | UUID generation |
| `image` | Thumbnail generation |
| `thiserror` | Error derive macros |
| `chrono` | Date/time handling |
| `walkdir` | Recursive directory traversal |
| `tempfile` | Temp files for tests |

- Before adding a new crate, check if the functionality already exists in the Tauri v2 API or the crates above.
- Prefer well-maintained crates with >1000 GitHub stars.
