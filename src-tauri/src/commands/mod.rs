pub mod collection;
pub mod file;
pub mod import;
pub mod library;
pub mod note;
pub mod person;
pub mod search;
pub mod system;
pub mod tag;

use crate::error::AppError;
use crate::state::{ActiveLibrary, AppState};
use tauri::State;

/// Aktif kütüphaneye salt-okunur erişim (yoksa hata).
pub(crate) fn with_active<R>(
    state: &State<'_, AppState>,
    f: impl FnOnce(&ActiveLibrary) -> Result<R, AppError>,
) -> Result<R, AppError> {
    let guard = state
        .active
        .lock()
        .map_err(|_| AppError::Unknown("aktif kütüphane kilidi bozuldu".into()))?;
    let active = guard
        .as_ref()
        .ok_or_else(|| AppError::InvalidInput("açık kütüphane yok".into()))?;
    f(active)
}

/// Aktif kütüphaneye değiştirilebilir erişim (metadata mutasyonu için).
pub(crate) fn with_active_mut<R>(
    state: &State<'_, AppState>,
    f: impl FnOnce(&mut ActiveLibrary) -> Result<R, AppError>,
) -> Result<R, AppError> {
    let mut guard = state
        .active
        .lock()
        .map_err(|_| AppError::Unknown("aktif kütüphane kilidi bozuldu".into()))?;
    let active = guard
        .as_mut()
        .ok_or_else(|| AppError::InvalidInput("açık kütüphane yok".into()))?;
    f(active)
}
