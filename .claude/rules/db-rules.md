---
paths:
  - "src-tauri/src/db/**/*"
  - "supabase/**/*"
  - "**/*migration*"
---

# YAD Database Rules

## Supabase MCP Mandatory Workflow

### DDL Operations (Schema Changes)

- **ALWAYS use `apply_migration`** for any DDL (CREATE, ALTER, DROP, CREATE INDEX, etc.).
- **NEVER use `execute_sql` for DDL.** `execute_sql` is only for DML queries (SELECT, INSERT, UPDATE, DELETE).
- After every migration, run **both** advisory checks:
  1. `get_advisors` with type `security` — check for missing RLS policies, exposed data
  2. `get_advisors` with type `performance` — check for missing indexes, slow patterns
- After any schema change, run `generate_typescript_types` to regenerate types for the frontend.

### Complete Supabase Workflow

```
1. apply_migration (DDL)
2. get_advisors (security)
3. get_advisors (performance)
4. Fix any issues found → apply_migration again if needed
5. generate_typescript_types
6. Update frontend types file
```

## Two-Tier Database Architecture

### Supabase (Remote — Auth, Workspace, RBAC)

Stores:
- User profiles (`profiles`)
- Workspaces (`workspaces`)
- Workspace memberships & roles (`workspace_members`)
- Invitations (`workspace_invites`)
- Registered computers (`registered_computers`)
- WebRTC signaling (`signaling` — ephemeral)

### SQLite (Local — Per-Volume Metadata)

Stores:
- File metadata (tags, notes, ratings, source URLs)
- Tag definitions and associations
- Person cards and file-person relations
- File index (path, hash, size, dates)
- Trash records

**Critical rule: File metadata NEVER lives in Supabase.** All file-related data stays in the volume's local `volume.db`. This ensures volumes are portable and self-contained.

## SQLite Configuration

- **WAL mode** (Write-Ahead Logging): Enable on every connection open.
  ```rust
  conn.pragma_update(None, "journal_mode", "WAL")?;
  ```
- **FTS5** for full-text search: Create virtual tables for searchable content.
  ```sql
  CREATE VIRTUAL TABLE files_fts USING fts5(
      filename, tags, notes, person_names,
      content=files, content_rowid=id
  );
  ```
- **Parameterized queries ONLY.** Never interpolate user input into SQL strings.
  ```rust
  // CORRECT
  conn.execute("SELECT * FROM files WHERE id = ?1", params![file_id])?;

  // FORBIDDEN
  conn.execute(&format!("SELECT * FROM files WHERE id = '{}'", file_id), [])?;
  ```

## RLS (Row Level Security)

- **Every Supabase table MUST have RLS enabled.**
- After creating a table, immediately create appropriate RLS policies.
- Common pattern:
  ```sql
  ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can view own data"
    ON table_name FOR SELECT
    USING (user_id = auth.uid());
  ```
- Run `get_advisors` (security) to catch any tables missing RLS.

## Atomic Operations

Filesystem and database operations MUST be atomic:

```
1. Begin SQLite transaction
2. Perform filesystem operation (move/copy/delete)
3. Update SQLite records
4. If step 2 or 3 fails → rollback transaction + undo filesystem change
5. Commit transaction
```

- For cross-volume file moves: copy to destination → update destination DB → delete from source → update source DB. If any step fails, rollback everything.
- Use `rusqlite::Transaction` for SQLite atomicity.

## Schema Conventions

| Convention | Rule |
|-----------|------|
| Primary keys | `id` (INTEGER or UUID) |
| Timestamps | `created_at`, `updated_at` (ISO 8601 text in SQLite, TIMESTAMPTZ in Supabase) |
| Foreign keys | `{table_singular}_id` (e.g., `volume_id`, `person_id`) |
| Boolean columns | `is_` prefix (e.g., `is_deleted`, `is_workspace_root`) |
| Soft delete | `is_deleted` flag + `deleted_at` timestamp |
| Indexes | Create on all foreign keys and frequently queried columns |
