//! Katman-2 metadata: **Automerge kaynak-doğruluk** + SQLite projeksiyonu.
//!
//! Etiket/koleksiyon/kişi/dosya-ilişki/not/rating tek bir Automerge dokümanında
//! (`.yad/metadata/metadata.automerge`) yaşar. Her mutasyon **yerel kimliğin actor'ı**
//! ile uygulanır (atıf günden bir — PRD §7.5). SQLite tabloları bu dokümandan türetilir
//! (hızlı sorgu görünümü). Çatışmasız birleşme (M5) Automerge ile gelir.

use crate::error::AppError;
use automerge::{ActorId, AutoCommit};
use autosurgeon::{hydrate, reconcile, Hydrate, Reconcile};
use rusqlite::{params, Connection};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Default, Reconcile, Hydrate)]
pub struct TagData {
    pub name: String,
    pub tag_type: String,
    pub parent_id: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Default, Reconcile, Hydrate)]
pub struct CollectionData {
    pub name: String,
    pub parent_id: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Default, Reconcile, Hydrate)]
pub struct PersonData {
    pub full_name: String,
    pub title: Option<String>,
    pub organization: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub avatar_path: Option<String>,
    pub bio: Option<String>,
}

/// Bir dosyanın Katman-2 ilişkileri/alanları.
#[derive(Debug, Clone, Default, Reconcile, Hydrate)]
pub struct FileMeta {
    pub tags: Vec<String>,
    pub persons: Vec<String>,
    pub collections: Vec<String>,
    pub rating: u64,
}

#[derive(Debug, Clone, Default, Reconcile, Hydrate)]
pub struct NoteData {
    pub content_json: String,
    pub updated_at: String,
    pub updated_by: String,
}

/// Kütüphane başına tek Automerge dokümanının kök şeması.
#[derive(Debug, Clone, Default, Reconcile, Hydrate)]
pub struct MetaDoc {
    pub tags: HashMap<String, TagData>,
    pub collections: HashMap<String, CollectionData>,
    pub persons: HashMap<String, PersonData>,
    pub files: HashMap<String, FileMeta>,
    pub notes: HashMap<String, NoteData>,
}

/// Automerge dokümanını sahiplenen depo; mutasyonu actor atıflı uygular ve diske yazar.
pub struct MetadataStore {
    doc: AutoCommit,
    path: PathBuf,
}

impl MetadataStore {
    /// Diskten yükler; yoksa boş bir doküman oluşturup hemen diske yazar.
    /// `actor_id` = yerel kimlik id (atıf için).
    pub fn open(path: &Path, actor_id: &str) -> Result<Self, AppError> {
        let existed = path.is_file();
        let mut doc = if existed {
            let bytes = std::fs::read(path)?;
            AutoCommit::load(&bytes)
                .map_err(|e| AppError::Unknown(format!("automerge yükleme: {e}")))?
        } else {
            let mut d = AutoCommit::new();
            reconcile(&mut d, MetaDoc::default())
                .map_err(|e| AppError::Unknown(format!("automerge init: {e}")))?;
            d
        };
        doc.set_actor(ActorId::from(actor_id.as_bytes()));
        let mut store = Self {
            doc,
            path: path.to_path_buf(),
        };
        if !existed {
            store.persist()?; // boş dokümanı diske yaz (kütüphane oluşturmada dosya hazır olsun)
        }
        Ok(store)
    }

    /// Güncel durumu Rust struct'ına çıkarır.
    pub fn read(&self) -> Result<MetaDoc, AppError> {
        hydrate(&self.doc).map_err(|e| AppError::Unknown(format!("automerge hydrate: {e}")))
    }

    /// `f` ile durumu değiştirir, actor atıflı reconcile eder ve diske atomik yazar.
    /// Güncellenmiş durumu döner (SQLite projeksiyonu için).
    pub fn mutate<F>(&mut self, f: F) -> Result<MetaDoc, AppError>
    where
        F: FnOnce(&mut MetaDoc),
    {
        let mut meta = self.read()?;
        f(&mut meta);
        reconcile(&mut self.doc, &meta)
            .map_err(|e| AppError::Unknown(format!("automerge reconcile: {e}")))?;
        self.persist()?;
        Ok(meta)
    }

    fn persist(&mut self) -> Result<(), AppError> {
        let bytes = self.doc.save();
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let tmp = self
            .path
            .with_extension(format!("automerge.tmp-{}", uuid::Uuid::new_v4()));
        std::fs::write(&tmp, &bytes)?;
        if let Err(e) = std::fs::rename(&tmp, &self.path) {
            let _ = std::fs::remove_file(&tmp);
            return Err(e.into());
        }
        Ok(())
    }
}

/// Automerge dokümanını SQLite görünümüne projekte eder (kaynak = doküman).
///
/// Katman-2 tablolarını (tag/collection/person/note + join'ler) yeniden kurar ve
/// `file` tablosunun türetilmiş alanlarını (`rating`, `has_note`) günceller. Tek transaction.
pub fn project_to_sqlite(conn: &Connection, meta: &MetaDoc) -> Result<(), AppError> {
    let tx = conn.unchecked_transaction()?;

    // Katman-2 tablolarını temizle.
    for table in [
        "file_tag",
        "file_collection",
        "file_person",
        "tag",
        "collection",
        "person",
        "note",
    ] {
        tx.execute(&format!("DELETE FROM {table}"), [])?;
    }

    for (id, t) in &meta.tags {
        tx.execute(
            "INSERT INTO tag (id, name, type, parent_id, color) VALUES (?1,?2,?3,?4,?5)",
            params![id, t.name, t.tag_type, t.parent_id, t.color],
        )?;
    }
    for (id, c) in &meta.collections {
        tx.execute(
            "INSERT INTO collection (id, name, parent_id, icon) VALUES (?1,?2,?3,?4)",
            params![id, c.name, c.parent_id, c.icon],
        )?;
    }
    for (id, p) in &meta.persons {
        tx.execute(
            "INSERT INTO person (id, full_name, title, organization, email, phone, avatar_path, bio) \
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
            params![id, p.full_name, p.title, p.organization, p.email, p.phone, p.avatar_path, p.bio],
        )?;
    }
    for (file_id, fm) in &meta.files {
        for tag_id in &fm.tags {
            tx.execute(
                "INSERT OR IGNORE INTO file_tag (file_id, tag_id) VALUES (?1,?2)",
                params![file_id, tag_id],
            )?;
        }
        for coll_id in &fm.collections {
            tx.execute(
                "INSERT OR IGNORE INTO file_collection (file_id, collection_id) VALUES (?1,?2)",
                params![file_id, coll_id],
            )?;
        }
        for person_id in &fm.persons {
            tx.execute(
                "INSERT OR IGNORE INTO file_person (file_id, person_id) VALUES (?1,?2)",
                params![file_id, person_id],
            )?;
        }
    }
    for (file_id, n) in &meta.notes {
        tx.execute(
            "INSERT INTO note (file_id, content_json, updated_at, updated_by) VALUES (?1,?2,?3,?4)",
            params![file_id, n.content_json, n.updated_at, n.updated_by],
        )?;
    }

    // file türetilmiş alanları: önce sıfırla, sonra doküman durumundan yaz.
    tx.execute("UPDATE file SET rating = 0, has_note = 0", [])?;
    for (file_id, fm) in &meta.files {
        tx.execute(
            "UPDATE file SET rating = ?1 WHERE id = ?2",
            params![fm.rating as i64, file_id],
        )?;
    }
    for file_id in meta.notes.keys() {
        tx.execute(
            "UPDATE file SET has_note = 1 WHERE id = ?1",
            params![file_id],
        )?;
    }

    tx.commit()?;

    // FTS indeksini güncel metadatayla yeniden kur (etiket/kişi/not adları aramaya girsin).
    crate::search::rebuild_fts(conn)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn open_mutate_persist_reload() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("metadata.automerge");

        {
            let mut store = MetadataStore::open(&path, "kullanici-1").unwrap();
            store
                .mutate(|m| {
                    m.tags.insert(
                        "t1".into(),
                        TagData {
                            name: "Deprem".into(),
                            tag_type: "event".into(),
                            parent_id: None,
                            color: Some("chart-1".into()),
                        },
                    );
                    m.files.insert(
                        "f1".into(),
                        FileMeta {
                            tags: vec!["t1".into()],
                            rating: 4,
                            ..Default::default()
                        },
                    );
                })
                .unwrap();
        }

        // Diskten yeniden yükle → durum korunur (Automerge kalıcılığı).
        let store = MetadataStore::open(&path, "kullanici-1").unwrap();
        let meta = store.read().unwrap();
        assert_eq!(meta.tags.get("t1").unwrap().name, "Deprem");
        assert_eq!(meta.files.get("f1").unwrap().rating, 4);
        assert_eq!(meta.files.get("f1").unwrap().tags, vec!["t1".to_string()]);
    }

    #[test]
    fn mutations_merge_conflict_free() {
        // İki ayrı cihaz aynı dokümanı bağımsız değiştirir → Automerge çatışmasız birleştirir.
        let dir = tempfile::tempdir().unwrap();
        let base_path = dir.path().join("base.automerge");
        let mut base = MetadataStore::open(&base_path, "a").unwrap();
        base.mutate(|m| {
            m.tags.insert(
                "t1".into(),
                TagData {
                    name: "A".into(),
                    tag_type: "free".into(),
                    ..Default::default()
                },
            );
        })
        .unwrap();

        // Fork: iki kopya.
        let mut doc_a = base.doc.fork();
        let mut doc_b = base.doc.fork();
        doc_a.set_actor(ActorId::from("a".as_bytes()));
        doc_b.set_actor(ActorId::from("b".as_bytes()));

        let mut ma: MetaDoc = hydrate(&doc_a).unwrap();
        ma.tags.insert(
            "t2".into(),
            TagData {
                name: "B".into(),
                tag_type: "free".into(),
                ..Default::default()
            },
        );
        reconcile(&mut doc_a, &ma).unwrap();

        let mut mb: MetaDoc = hydrate(&doc_b).unwrap();
        mb.tags.insert(
            "t3".into(),
            TagData {
                name: "C".into(),
                tag_type: "free".into(),
                ..Default::default()
            },
        );
        reconcile(&mut doc_b, &mb).unwrap();

        // Birleştir.
        doc_a.merge(&mut doc_b).unwrap();
        let merged: MetaDoc = hydrate(&doc_a).unwrap();
        assert!(merged.tags.contains_key("t1"));
        assert!(merged.tags.contains_key("t2"));
        assert!(merged.tags.contains_key("t3"));
    }
}
