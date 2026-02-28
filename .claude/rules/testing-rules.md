---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "tests/**/*"
---

# YAD Testing Rules

## Tauri MCP Test Workflow

When testing the running Tauri application, use the Tauri MCP tools in this sequence:

### 1. Connect to the App
```
driver_session (action: "start") → Establish connection to running Tauri app
```

### 2. UI Verification
```
webview_dom_snapshot (type: "accessibility") → Verify semantic structure, roles, ARIA
webview_dom_snapshot (type: "structure")     → Verify DOM hierarchy, classes, IDs
webview_find_element (selector)              → Locate specific elements
```

### 3. Interaction Testing
```
webview_interact (action: "click")       → Click buttons, links, menu items
webview_interact (action: "double-click") → Double-click file items
webview_interact (action: "scroll")      → Test scrollable areas
webview_interact (action: "focus")       → Focus form elements
```

### 4. Input Testing
```
webview_keyboard (action: "type")  → Type text into inputs, search bars
webview_keyboard (action: "press") → Send keyboard shortcuts (Ctrl+K, Enter, Escape)
```

### 5. Visual Verification
```
webview_screenshot → Capture current state for visual comparison
```

### 6. Tauri Command Testing
```
ipc_execute_command (command) → Test Rust backend commands directly
```

### 7. IPC Traffic Monitoring
```
ipc_monitor (action: "start")  → Begin capturing IPC calls
ipc_get_captured               → Review captured invoke() calls and responses
ipc_monitor (action: "stop")   → Stop monitoring
```

### 8. Debugging
```
read_logs (source: "console") → Check webview JavaScript console output
read_logs (source: "system")  → Check desktop/system logs
```

### 9. Responsive Testing
```
manage_window (action: "resize", width, height) → Test at different viewport sizes
```

### 10. Cleanup
```
driver_session (action: "stop") → Disconnect from the app
```

## Rust Unit Tests

- Place tests in the same file with `#[cfg(test)]` module.
- Use **in-memory SQLite** for database tests:
  ```rust
  let conn = Connection::open_in_memory()?;
  ```
- Use `tempfile::TempDir` for filesystem operation tests.
- Test error cases explicitly: invalid paths, missing volumes, permission denied scenarios.
- Test the physical mapping principle: every DB operation paired with its filesystem counterpart.
- Name tests descriptively: `test_move_file_updates_db_and_filesystem`, `test_path_traversal_rejected`.

## Frontend Tests

- Use **Vitest** as the test runner.
- Mock Tauri `invoke` calls using `@tauri-apps/api/core` mocks:
  ```typescript
  vi.mock("@tauri-apps/api/core", () => ({
    invoke: vi.fn(),
  }));
  ```
- Test components with React Testing Library.
- Test Zustand stores independently by accessing store actions directly.
- Test both light and dark mode rendering for visual components.

## After Adding shadcn Components

After installing any shadcn component, always run:
```
get_audit_checklist → Verify component installation and configuration
```

This checks for: correct imports, proper theme variable usage, missing dependencies, and configuration issues.

## Test File Naming

| Type | Pattern | Location |
|------|---------|----------|
| Rust unit tests | `#[cfg(test)] mod tests` | Same file as source |
| Rust integration tests | `*.rs` | `src-tauri/tests/` |
| Frontend unit tests | `*.test.ts` / `*.test.tsx` | Next to source file |
| Frontend integration tests | `*.spec.ts` / `*.spec.tsx` | `tests/` directory |

## What to Test

- **Always test:** Tauri command handlers, Zustand store logic, SQLite queries, file operations, RBAC enforcement, path validation
- **Skip testing:** shadcn component internals (tested upstream), pure Tailwind styling, static layout
