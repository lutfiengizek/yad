//! M6 komutları: otomatik güncelleme (tauri-plugin-updater + GitHub Releases).
//!
//! İmzalı güncelleme: `tauri.conf.json` → `plugins.updater.endpoints` + `pubkey`.
//! İmza anahtar çifti **sürüm/yayın zamanında** üretilir (`tauri signer generate`);
//! özel anahtar CI sırrı, public anahtar config'e konur. Geliştirmede endpoint yoksa
//! `update_check` hata döner (beklenen).

use crate::error::AppError;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub available: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
}

#[tauri::command]
pub async fn update_check(app: AppHandle) -> Result<UpdateInfo, AppError> {
    let updater = app
        .updater()
        .map_err(|e| AppError::Unknown(format!("güncelleyici kurulamadı: {e}")))?;
    match updater.check().await {
        Ok(Some(update)) => {
            let version = update.version.clone();
            let _ = app.emit(
                "update:available",
                serde_json::json!({ "version": version }),
            );
            Ok(UpdateInfo {
                available: true,
                version: Some(version),
            })
        }
        Ok(None) => Ok(UpdateInfo {
            available: false,
            version: None,
        }),
        Err(e) => Err(AppError::Unknown(format!("güncelleme kontrolü: {e}"))),
    }
}

#[tauri::command]
pub async fn update_install(app: AppHandle) -> Result<(), AppError> {
    let updater = app
        .updater()
        .map_err(|e| AppError::Unknown(format!("güncelleyici kurulamadı: {e}")))?;
    let update = updater
        .check()
        .await
        .map_err(|e| AppError::Unknown(format!("güncelleme kontrolü: {e}")))?
        .ok_or_else(|| AppError::NotFound("kurulacak güncelleme yok".into()))?;

    update
        .download_and_install(|_chunk, _total| {}, || {})
        .await
        .map_err(|e| AppError::Unknown(format!("güncelleme kurulamadı: {e}")))?;
    Ok(())
}
