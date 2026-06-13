//! FTS5 tam-metin arama indeksi (türetilmiş görünüm).
//!
//! `file_fts` tablosu dosya adı + etiket adları + kişi adları + not metninden beslenir.
//! Metadata/dosya değiştiğinde [`rebuild_fts`] ile yeniden kurulur (M3 ölçeğinde ucuz).

use crate::error::AppError;
use rusqlite::Connection;

/// Kullanıcı metnini FTS5 MATCH sorgusuna çevirir (token başına önek eşleşmesi, AND).
///
/// Boş/yalnızca-boşluk girdi → `None` (metin filtresi uygulanmaz). Tırnaklar temizlenir.
pub fn fts_match_query(text: &str) -> Option<String> {
    let tokens: Vec<String> = text
        .split_whitespace()
        .map(|t| t.replace('"', ""))
        .filter(|t| !t.is_empty())
        .map(|t| format!("\"{t}\"*"))
        .collect();
    if tokens.is_empty() {
        None
    } else {
        Some(tokens.join(" "))
    }
}

/// FTS indeksini sıfırdan kurar (çöptekiler hariç). Dosya import'u ve metadata projeksiyonu
/// sonrası çağrılır.
pub fn rebuild_fts(conn: &Connection) -> Result<(), AppError> {
    conn.execute("DELETE FROM file_fts", [])?;
    conn.execute(
        "INSERT INTO file_fts (file_id, name, tags, persons, note)
         SELECT f.id, f.name,
           COALESCE((SELECT group_concat(t.name, ' ') FROM file_tag ft JOIN tag t ON t.id = ft.tag_id WHERE ft.file_id = f.id), ''),
           COALESCE((SELECT group_concat(p.full_name, ' ') FROM file_person fp JOIN person p ON p.id = fp.person_id WHERE fp.file_id = f.id), ''),
           COALESCE((SELECT content_json FROM note WHERE note.file_id = f.id), '')
         FROM file f
         WHERE f.trashed_at IS NULL",
        [],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn match_query_builds_prefix_and_tokens() {
        assert_eq!(fts_match_query("  "), None);
        assert_eq!(fts_match_query("deprem"), Some("\"deprem\"*".to_string()));
        assert_eq!(
            fts_match_query("deprem ankara"),
            Some("\"deprem\"* \"ankara\"*".to_string())
        );
    }
}
