//! Kütüphane disk yerleşimi ve volume yaşam döngüsü.
//!
//! Disk yapısı (PRD §4.2):
//! ```text
//! <root>/
//! ├── .yad/
//! │   ├── volume-id.json   ← kütüphane kimliği
//! │   ├── index.db         ← SQLite türetilmiş görünüm
//! │   ├── metadata/        ← Automerge (M2)
//! │   ├── blobs/           ← içerik-adresli sürüm deposu (M4)
//! │   ├── thumbnails/      ← önizleme cache (BLAKE3 adlı .webp)
//! │   └── export/          ← JSON yedeği (M4)
//! └── Dosyalar/            ← gerçek, okunabilir çalışma kopyaları
//! ```

use crate::error::AppError;
use crate::models::{Volume, VolumeStatus};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

pub const YAD_DIR: &str = ".yad";
pub const FILES_DIR: &str = "Dosyalar";
const VOLUME_ID_FILE: &str = "volume-id.json";
const INDEX_DB: &str = "index.db";

pub fn yad_dir(root: &Path) -> PathBuf {
    root.join(YAD_DIR)
}
pub fn files_dir(root: &Path) -> PathBuf {
    root.join(FILES_DIR)
}
pub fn index_db_path(root: &Path) -> PathBuf {
    yad_dir(root).join(INDEX_DB)
}
pub fn thumbnails_dir(root: &Path) -> PathBuf {
    yad_dir(root).join("thumbnails")
}
pub fn blobs_dir(root: &Path) -> PathBuf {
    yad_dir(root).join("blobs")
}
pub fn metadata_path(root: &Path) -> PathBuf {
    yad_dir(root).join("metadata").join("metadata.automerge")
}

/// `.yad/volume-id.json` içeriği — kütüphane kimliğini taşır (taşınabilirlik).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VolumeIdFile {
    pub library_id: String,
    pub name: String,
    pub created_at: String,
    pub schema: u32,
}

/// Bir yolun YAD kütüphanesi olup olmadığı (`.yad/volume-id.json` var mı).
pub fn is_yad_library(root: &Path) -> bool {
    yad_dir(root).join(VOLUME_ID_FILE).is_file()
}

/// `.yad/volume-id.json` okur.
pub fn read_volume_id(root: &Path) -> Result<VolumeIdFile, AppError> {
    let path = yad_dir(root).join(VOLUME_ID_FILE);
    let raw = std::fs::read_to_string(&path).map_err(|_| {
        AppError::NotFound(format!("volume-id.json bulunamadı: {}", path.display()))
    })?;
    Ok(serde_json::from_str(&raw)?)
}

/// Yeni bir kütüphane için disk yerleşimini kurar ve `volume-id.json` yazar.
///
/// Klasör zaten bir YAD kütüphanesiyse hata döner (üzerine yazma yok).
pub fn init_library_layout(
    root: &Path,
    library_id: &str,
    name: &str,
    created_at: &str,
) -> Result<(), AppError> {
    if is_yad_library(root) {
        return Err(AppError::InvalidInput(format!(
            "bu klasör zaten bir YAD kütüphanesi: {}",
            root.display()
        )));
    }

    let yad = yad_dir(root);
    for dir in [
        yad.clone(),
        yad.join("metadata"),
        yad.join("blobs"),
        yad.join("thumbnails"),
        yad.join("export"),
        files_dir(root),
    ] {
        std::fs::create_dir_all(&dir)?;
    }

    let id_file = VolumeIdFile {
        library_id: library_id.to_string(),
        name: name.to_string(),
        created_at: created_at.to_string(),
        schema: 1,
    };
    let json = serde_json::to_string_pretty(&id_file)?;
    std::fs::write(yad.join(VOLUME_ID_FILE), json)?;
    Ok(())
}

/// Bir kütüphanenin diskteki erişilebilirliğini sınar (kök + `.yad/` mevcut mu).
pub fn detect_status(root: &Path) -> VolumeStatus {
    if is_yad_library(root) {
        VolumeStatus::Connected
    } else {
        VolumeStatus::Offline
    }
}

/// Kütüphanenin çalışma-kökü (workspace-root) volume'unu üretir.
///
/// M1'de her kütüphanenin tek bir varsayılan volume'u vardır: kütüphane kökü.
pub fn workspace_root_volume(library_id: &str, name: &str, root: &Path) -> Volume {
    Volume {
        id: library_id.to_string(),
        library_id: library_id.to_string(),
        name: name.to_string(),
        root_path: root.to_string_lossy().to_string(),
        status: detect_status(root),
        is_workspace_root: true,
        disk_label: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn init_layout_creates_dirs_and_id_file() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path();
        init_library_layout(root, "lib-1", "Arşivim", "2026-06-13T00:00:00Z").unwrap();

        assert!(is_yad_library(root));
        assert!(files_dir(root).is_dir());
        assert!(thumbnails_dir(root).is_dir());
        assert!(yad_dir(root).join("metadata").is_dir());

        let id = read_volume_id(root).unwrap();
        assert_eq!(id.library_id, "lib-1");
        assert_eq!(id.name, "Arşivim");
        assert_eq!(detect_status(root), VolumeStatus::Connected);
    }

    #[test]
    fn init_layout_rejects_existing_library() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path();
        init_library_layout(root, "lib-1", "A", "2026-06-13T00:00:00Z").unwrap();
        assert!(init_library_layout(root, "lib-2", "B", "2026-06-13T00:00:00Z").is_err());
    }
}
