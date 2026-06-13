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

/// Kütüphane-başına şema, v1 (M1): volume + dosya kaydı (türetilmiş arama görünümü).
///
/// `file` tablosu Katman-1'dir (dosya kimliği/içerik). Katman-2 metadata (tag/note/...)
/// M2'de Automerge'den projekte edilen ek tablolarla gelir.
const LIB_V1: &str = r#"
CREATE TABLE volume (
    id                TEXT PRIMARY KEY,
    library_id        TEXT NOT NULL,
    name              TEXT NOT NULL,
    root_path         TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'connected',
    is_workspace_root INTEGER NOT NULL DEFAULT 0,
    disk_label        TEXT
);

CREATE TABLE file (
    id            TEXT PRIMARY KEY,
    volume_id     TEXT NOT NULL,
    name          TEXT NOT NULL,
    rel_path      TEXT NOT NULL,
    abs_path      TEXT NOT NULL,
    ext           TEXT NOT NULL,
    mime          TEXT NOT NULL,
    kind          TEXT NOT NULL,
    size_bytes    INTEGER NOT NULL,
    content_hash  TEXT NOT NULL,
    thumbnail_path TEXT,
    source_url    TEXT,
    rating        INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    added_at      TEXT NOT NULL,
    modified_at   TEXT NOT NULL,
    is_available  INTEGER NOT NULL DEFAULT 1,
    has_note      INTEGER NOT NULL DEFAULT 0,
    trashed_at    TEXT,
    FOREIGN KEY(volume_id) REFERENCES volume(id)
);

CREATE INDEX idx_file_volume ON file(volume_id);
CREATE INDEX idx_file_hash ON file(content_hash);
"#;

/// Kütüphane-başına şema, v2 (M2): Katman-2 metadata projeksiyonu (Automerge'den türetilir).
const LIB_V2: &str = r#"
CREATE TABLE tag (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    type      TEXT NOT NULL,
    parent_id TEXT,
    color     TEXT
);
CREATE TABLE file_tag (
    file_id TEXT NOT NULL,
    tag_id  TEXT NOT NULL,
    PRIMARY KEY(file_id, tag_id)
);
CREATE INDEX idx_file_tag_tag ON file_tag(tag_id);

CREATE TABLE collection (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    parent_id TEXT,
    icon      TEXT
);
CREATE TABLE file_collection (
    file_id       TEXT NOT NULL,
    collection_id TEXT NOT NULL,
    PRIMARY KEY(file_id, collection_id)
);
CREATE INDEX idx_file_collection_coll ON file_collection(collection_id);

CREATE TABLE person (
    id           TEXT PRIMARY KEY,
    full_name    TEXT NOT NULL,
    title        TEXT,
    organization TEXT,
    email        TEXT,
    phone        TEXT,
    avatar_path  TEXT,
    bio          TEXT
);
CREATE TABLE file_person (
    file_id   TEXT NOT NULL,
    person_id TEXT NOT NULL,
    PRIMARY KEY(file_id, person_id)
);
CREATE INDEX idx_file_person_person ON file_person(person_id);

CREATE TABLE note (
    file_id      TEXT PRIMARY KEY,
    content_json TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    updated_by   TEXT NOT NULL
);
"#;

/// Kütüphane-başına şema, v3 (M3): FTS5 tam-metin arama görünümü.
///
/// `file_id` UNINDEXED (saklanır, aranmaz). Türkçe için `remove_diacritics 2`
/// (diakritik-duyarsız: "deprem" ↔ "déprem"). İçerik dosya + etiket/kişi/not'tan türetilir.
const LIB_V3: &str = r#"
CREATE VIRTUAL TABLE file_fts USING fts5(
    file_id UNINDEXED,
    name,
    tags,
    persons,
    note,
    tokenize = 'unicode61 remove_diacritics 2'
);
"#;

/// Kütüphane-başına şema, v4 (M4): içerik-adresli sürüm geçmişi + aktivite/atıf.
const LIB_V4: &str = r#"
CREATE TABLE version (
    id           TEXT PRIMARY KEY,
    file_id      TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    size_bytes   INTEGER NOT NULL,
    label        TEXT NOT NULL,
    author_id    TEXT NOT NULL,
    author_name  TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    is_current   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_version_file ON version(file_id);

CREATE TABLE activity (
    id          TEXT PRIMARY KEY,
    actor_id    TEXT NOT NULL,
    actor_name  TEXT NOT NULL,
    action      TEXT NOT NULL,
    object_type TEXT NOT NULL,
    object_id   TEXT NOT NULL,
    object_name TEXT NOT NULL,
    params_json TEXT,
    created_at  TEXT NOT NULL,
    undoable    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_activity_created ON activity(created_at);
"#;

/// Kütüphane-başına (`<root>/.yad/index.db`) migration'ları sırayla uygular (idempotent).
pub fn run_library_migrations(conn: &Connection) -> Result<(), AppError> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;

    if version < 1 {
        conn.execute_batch(LIB_V1)?;
        conn.pragma_update(None, "user_version", 1)?;
    }
    if version < 2 {
        conn.execute_batch(LIB_V2)?;
        conn.pragma_update(None, "user_version", 2)?;
    }
    if version < 3 {
        conn.execute_batch(LIB_V3)?;
        conn.pragma_update(None, "user_version", 3)?;
    }
    if version < 4 {
        conn.execute_batch(LIB_V4)?;
        conn.pragma_update(None, "user_version", 4)?;
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
