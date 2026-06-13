//! `PRAGMA user_version` tabanlı basit migration runner.
//!
//! İki ayrı veritabanı vardır:
//! - **App-global DB** (`<app_data>/yad.db`): kütüphane kaydı, ayarlar, kimlik.
//! - **Kütüphane-başına DB** (`<root>/.yad/index.db`): volume, dosya, (M2+) metadata görünümü.
//!
//! Her biri kendi sürüm dizisini taşır. M0 yalnızca app-global v1'i uygular.

use crate::error::AppError;
use rusqlite::Connection;

/// App-global şema, v1 (M0): kütüphane kaydı + ayarlar + kimlik.
const APP_V1: &str = r#"
CREATE TABLE library (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    root_path         TEXT NOT NULL UNIQUE,
    is_workspace_root INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL
);

CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL          -- JSON
);

CREATE TABLE identity (
    id           TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    organization TEXT,
    avatar_path  TEXT,
    node_id      TEXT
);
"#;

/// App-global migration'ları sırayla uygular (idempotent).
pub fn run_app_migrations(conn: &Connection) -> Result<(), AppError> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;

    if version < 1 {
        conn.execute_batch(APP_V1)?;
        conn.pragma_update(None, "user_version", 1)?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_migrations_set_version_and_tables() {
        let conn = Connection::open_in_memory().unwrap();
        run_app_migrations(&conn).unwrap();

        let version: i64 = conn
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .unwrap();
        assert_eq!(version, 1);

        // Tablolar mevcut mu?
        for table in ["library", "settings", "identity"] {
            let count: i64 = conn
                .query_row(
                    "SELECT count(*) FROM sqlite_master WHERE type='table' AND name=?1",
                    [table],
                    |r| r.get(0),
                )
                .unwrap();
            assert_eq!(count, 1, "tablo eksik: {table}");
        }
    }

    #[test]
    fn app_migrations_are_idempotent() {
        let conn = Connection::open_in_memory().unwrap();
        run_app_migrations(&conn).unwrap();
        // İkinci çalıştırma hata vermemeli (tablolar zaten var).
        run_app_migrations(&conn).unwrap();
        let version: i64 = conn
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .unwrap();
        assert_eq!(version, 1);
    }
}
