//! M5 P2P (Iroh) — temel düğüm yaşam döngüsü.
//!
//! **Sürüm kararı (PoC ile doğrulandı):** `iroh`/`iroh-blobs` **0.35** (PRD'nin önerdiği
//! kararlı seri). Güncel hat (`iroh 0.98`/`iroh-blobs 0.102`) `automerge 0.10` ile derlenmiyor
//! (`sha2` rc vs kararlı çatışması). 0.35 çifti Automerge ile sorunsuz derleniyor.
//!
//! Bu modül M5 boyunca genişler: düğüm kimliği (NodeId keypair, kalıcı), davet bileti,
//! iroh-blobs ile dosya transferi, iroh-docs ile Automerge update taşıma, roller, çatışma.
//! Gerçek eşler-arası akış 2-cihaz testiyle doğrulanır.

use crate::error::AppError;
use iroh::{Endpoint, RelayMode};

/// Bir Iroh endpoint'i (düğüm) başlatır. Relay devre dışı (yerel/offline PoC);
/// üretimde self-hosted relay + discovery yapılandırılır (PRD §8.3).
#[allow(dead_code)] // M5 düğüm/senkron komutlarında kullanılacak (şimdilik PoC + test)
pub async fn bind_endpoint() -> Result<Endpoint, AppError> {
    Endpoint::builder()
        .relay_mode(RelayMode::Disabled)
        .bind()
        .await
        .map_err(|e| AppError::Unknown(format!("iroh endpoint başlatılamadı: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// PoC: endpoint başlar ve sıfır-olmayan bir NodeId üretir (keypair çalışıyor).
    #[tokio::test]
    async fn endpoint_binds_and_has_node_id() {
        let ep = bind_endpoint().await.unwrap();
        let node_id = ep.node_id();
        assert!(
            !node_id.as_bytes().iter().all(|b| *b == 0),
            "NodeId sıfır olmamalı"
        );
        ep.close().await;
    }
}
