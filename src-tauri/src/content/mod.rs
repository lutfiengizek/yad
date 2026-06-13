//! İçerik işleme: BLAKE3 hash, MIME/tür tespiti, görsel thumbnail üretimi.
//!
//! Thumbnail kapsamı (M1): yalnızca görseller (lossless WebP). Video/ses için FE
//! jenerik tür ikonu gösterir.

use crate::error::AppError;
use crate::models::FileKind;
use std::path::Path;

const THUMB_MAX: u32 = 512;

/// Bir dosyanın içeriğinin BLAKE3 hash'i (hex). Akış halinde okur (GB-ölçeği güvenli).
pub fn hash_file(path: &Path) -> Result<String, AppError> {
    let mut file = std::fs::File::open(path)?;
    let mut hasher = blake3::Hasher::new();
    std::io::copy(&mut file, &mut hasher)?;
    Ok(hasher.finalize().to_hex().to_string())
}

/// Uzantıdan MIME tahmini (yoksa `application/octet-stream`).
pub fn detect_mime(path: &Path) -> String {
    mime_guess::from_path(path)
        .first_or_octet_stream()
        .to_string()
}

/// MIME'den dosya türü kümesi.
pub fn kind_from_mime(mime: &str) -> FileKind {
    if mime.starts_with("image/") {
        FileKind::Image
    } else if mime.starts_with("video/") {
        FileKind::Video
    } else if mime.starts_with("audio/") {
        FileKind::Audio
    } else if mime == "application/pdf"
        || mime.starts_with("text/")
        || mime == "application/rtf"
        || mime.contains("word")
        || mime.contains("officedocument")
        || mime.contains("opendocument")
    {
        FileKind::Document
    } else {
        FileKind::Other
    }
}

/// Küçük harfli uzantı (noktasız). Uzantı yoksa boş dize.
pub fn extension(path: &Path) -> String {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default()
}

/// Görsel ise `<thumb_dir>/<hash>.webp` üretir ve yolunu döner; değilse `None`.
///
/// Bozuk/okunamayan görsel thumbnail üretmez (hata yutulur) — `None` döner.
pub fn generate_thumbnail(
    src: &Path,
    kind: FileKind,
    thumb_dir: &Path,
    content_hash: &str,
) -> Result<Option<String>, AppError> {
    if kind != FileKind::Image {
        return Ok(None);
    }

    let img = match image::open(src) {
        Ok(img) => img,
        Err(_) => return Ok(None), // çözülemeyen görsel → thumbnail yok
    };

    let thumb = img.thumbnail(THUMB_MAX, THUMB_MAX);
    std::fs::create_dir_all(thumb_dir)?;
    let out_path = thumb_dir.join(format!("{content_hash}.webp"));

    let mut out = std::fs::File::create(&out_path)?;
    thumb
        .write_to(&mut out, image::ImageFormat::WebP)
        .map_err(|e| AppError::Io(format!("thumbnail yazılamadı: {e}")))?;

    Ok(Some(out_path.to_string_lossy().to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn hash_is_deterministic_and_content_addressed() {
        let dir = tempfile::tempdir().unwrap();
        let a = dir.path().join("a.txt");
        let b = dir.path().join("b.txt");
        std::fs::write(&a, b"merhaba dunya").unwrap();
        std::fs::write(&b, b"merhaba dunya").unwrap();
        let ha = hash_file(&a).unwrap();
        let hb = hash_file(&b).unwrap();
        assert_eq!(ha, hb, "aynı içerik → aynı hash");
        assert_eq!(ha.len(), 64, "BLAKE3 hex 32 bayt = 64 karakter");

        std::fs::write(&b, b"baska icerik").unwrap();
        assert_ne!(ha, hash_file(&b).unwrap());
    }

    #[test]
    fn mime_and_kind_detection() {
        assert_eq!(kind_from_mime("image/png"), FileKind::Image);
        assert_eq!(kind_from_mime("video/mp4"), FileKind::Video);
        assert_eq!(kind_from_mime("audio/mpeg"), FileKind::Audio);
        assert_eq!(kind_from_mime("application/pdf"), FileKind::Document);
        assert_eq!(kind_from_mime("text/plain"), FileKind::Document);
        assert_eq!(kind_from_mime("application/octet-stream"), FileKind::Other);
        assert_eq!(detect_mime(Path::new("x.png")), "image/png");
    }

    #[test]
    fn thumbnail_only_for_images() {
        let dir = tempfile::tempdir().unwrap();
        let thumb_dir = dir.path().join("thumbs");

        // Gerçek küçük bir PNG üret.
        let img_path = dir.path().join("pic.png");
        let img = image::RgbImage::from_pixel(10, 10, image::Rgb([120, 80, 40]));
        img.save(&img_path).unwrap();
        let hash = hash_file(&img_path).unwrap();

        let thumb = generate_thumbnail(&img_path, FileKind::Image, &thumb_dir, &hash).unwrap();
        assert!(thumb.is_some());
        assert!(Path::new(&thumb.unwrap()).is_file());

        // Görsel olmayan → None.
        let txt = dir.path().join("note.txt");
        let mut f = std::fs::File::create(&txt).unwrap();
        f.write_all(b"selam").unwrap();
        let none = generate_thumbnail(&txt, FileKind::Document, &thumb_dir, "abc").unwrap();
        assert!(none.is_none());
    }
}
