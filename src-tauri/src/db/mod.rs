//! SQLite bağlantı yönetimi.
//!
//! Her bağlantıda WAL modu ve foreign_keys açılır (`db-rules.md`). Tüm sorgular
//! parametrelidir; kullanıcı girdisi asla SQL'e enterpolasyonla gömülmez.

pub mod migrations;

use crate::error::AppError;
use rusqlite::Connection;
use std::path::Path;

/// Bir bağlantıda zorunlu pragma'ları uygular.
fn apply_pragmas(conn: &Connection) -> Result<(), AppError> {
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", true)?;
    Ok(())
}

/// App-global veritabanını açar (`<app_data>/yad.db`) ve migration'ları uygular.
///
/// Üst dizin yoksa oluşturulur.
pub fn open_app_db(path: &Path) -> Result<Connection, AppError> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(path)?;
    apply_pragmas(&conn)?;
    migrations::run_app_migrations(&conn)?;
    Ok(conn)
}

/// Kütüphane-başına `index.db` açar (`<root>/.yad/index.db`) ve migration'ları uygular.
///
/// Üst dizinin (`.yad/`) önceden var olduğu varsayılır (kütüphane oluşturma adımında kurulur).
pub fn open_library_db(path: &Path) -> Result<Connection, AppError> {
    let conn = Connection::open(path)?;
    apply_pragmas(&conn)?;
    migrations::run_library_migrations(&conn)?;
    Ok(conn)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn open_app_db_creates_file_and_schema() {
        let dir = tempfile::tempdir().unwrap();
        let db_path = dir.path().join("sub").join("yad.db");
        let conn = open_app_db(&db_path).unwrap();

        assert!(db_path.exists());
        let version: i64 = conn
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .unwrap();
        assert_eq!(version, 1);
    }
}
