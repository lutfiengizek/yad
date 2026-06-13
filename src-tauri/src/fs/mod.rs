//! Güvenli dosya sistemi işlemleri: atomik kopyalama, ad temizleme, çakışma çözümü.
//!
//! Atomiklik: hedef dizinde geçici dosyaya kopyala → `rename` (aynı volume'da atomik).
//! Yarıda kesilme kısmi dosya bırakmaz (geçici dosya silinir).

use crate::error::AppError;
use std::path::{Path, PathBuf};

/// Kullanıcı-girdili dosya adını doğrular/temizler (yeniden adlandırma için).
///
/// Yol ayırıcı, `..`, kontrol karakteri reddedilir; uzunluk sınırlanır.
pub fn validate_file_name(name: &str) -> Result<String, AppError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidInput("dosya adı boş olamaz".into()));
    }
    if trimmed.len() > 255 {
        return Err(AppError::InvalidInput("dosya adı çok uzun (>255)".into()));
    }
    if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains("..") {
        return Err(AppError::PathTraversal(format!(
            "dosya adında yol ayırıcı/.. olamaz: {trimmed}"
        )));
    }
    if trimmed.chars().any(|c| c.is_control()) {
        return Err(AppError::InvalidInput(
            "dosya adında kontrol karakteri olamaz".into(),
        ));
    }
    Ok(trimmed.to_string())
}

/// `dir` içinde `file_name` ile çakışmayan bir hedef yol üretir.
///
/// Çakışma varsa `ad (2).uzantı`, `ad (3).uzantı`, ... dener.
pub fn unique_dest_path(dir: &Path, file_name: &str) -> PathBuf {
    let candidate = dir.join(file_name);
    if !candidate.exists() {
        return candidate;
    }

    let path = Path::new(file_name);
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(file_name);
    let ext = path.extension().and_then(|e| e.to_str());

    let mut n = 2;
    loop {
        let name = match ext {
            Some(ext) => format!("{stem} ({n}).{ext}"),
            None => format!("{stem} ({n})"),
        };
        let candidate = dir.join(&name);
        if !candidate.exists() {
            return candidate;
        }
        n += 1;
    }
}

/// `src`'i `dest`'e atomik kopyalar (geçici dosya + rename). Üst dizin önceden var olmalı.
pub fn atomic_copy(src: &Path, dest: &Path) -> Result<(), AppError> {
    let parent = dest
        .parent()
        .ok_or_else(|| AppError::InvalidInput("hedef yolun üst dizini yok".into()))?;
    let tmp = parent.join(format!(".tmp-{}", uuid::Uuid::new_v4()));

    // Kopyala; başarısız olursa geçici dosyayı temizle.
    if let Err(e) = std::fs::copy(src, &tmp) {
        let _ = std::fs::remove_file(&tmp);
        return Err(e.into());
    }

    if let Err(e) = std::fs::rename(&tmp, dest) {
        let _ = std::fs::remove_file(&tmp);
        return Err(e.into());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_rejects_traversal_and_empty() {
        assert!(validate_file_name("../gizli").is_err());
        assert!(validate_file_name("a/b.txt").is_err());
        assert!(validate_file_name("a\\b.txt").is_err());
        assert!(validate_file_name("   ").is_err());
        assert_eq!(validate_file_name("  resim.png ").unwrap(), "resim.png");
    }

    #[test]
    fn atomic_copy_writes_full_file() {
        let dir = tempfile::tempdir().unwrap();
        let src = dir.path().join("src.bin");
        std::fs::write(&src, b"icerik-123").unwrap();
        let dest = dir.path().join("Dosyalar").join("src.bin");
        std::fs::create_dir_all(dest.parent().unwrap()).unwrap();

        atomic_copy(&src, &dest).unwrap();
        assert_eq!(std::fs::read(&dest).unwrap(), b"icerik-123");
        // Geçici dosya kalmadı.
        let leftovers: Vec<_> = std::fs::read_dir(dest.parent().unwrap())
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_name().to_string_lossy().starts_with(".tmp-"))
            .collect();
        assert!(leftovers.is_empty());
    }

    #[test]
    fn unique_dest_resolves_collision() {
        let dir = tempfile::tempdir().unwrap();
        let d = dir.path();
        std::fs::write(d.join("a.txt"), b"1").unwrap();
        let p = unique_dest_path(d, "a.txt");
        assert_eq!(p.file_name().unwrap().to_str().unwrap(), "a (2).txt");
    }
}
