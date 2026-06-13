# YAD — Backend Agent Brief

**Rolün:** YAD'ın tüm backend'ini (`src-tauri/`) inşa etmek — dosya işlemleri, DB, içerik-adresli depo, metadata (CRDT), P2P, güvenlik. Frontend'e dokunmazsın (`src/` yasak).

## Önce oku (sırayla)
1. `docs/build/00-build-overview.md` — işbirliği modeli, milestone'lar, test politikası, "önce planla" akışı
2. `docs/build/01-api-contract.md` — frontend ile sözleşmen (komut imzaları, tipler, event'ler) — **aynen uygula**
3. `yad-prd-v4.md` — mimari kararlar (özellikle §3 iki katman, §4 depolama, §7-9 işbirliği/güvenlik)
4. `.claude/rules/architecture-rules.md` — **proje yapısı, frontend-backend sınırı, isimlendirme**

## İlk çıktın: kısa PLAN, sonra direkt kod
`docs/build/plans/backend-plan.md` üret: milestone bazında görev listesi, modül/dosya ağacı (`commands/`, `db/`, `volume/`, `fs/`, `models/`, `error.rs`, `state.rs`), veri modeli tasarımı (SQLite şeması + Automerge doküman şeması), her görevin test yaklaşımı, definition of done, riskler/açık sorular. **Onay bekleme — planı yazdıktan sonra doğrudan kodlamaya başla.** Sadece gerçek bir belirsizlik/çelişki varsa sor.

## Kesin kurallar (architecture-rules.md)
- **Backend tek otoritedir:** dosya işlemleri, SQLite, volume yönetimi, güvenlik, (sonra) RBAC. Frontend bunların hiçbirini yapmaz.
- **Modül yapısı:** `commands/` (domain bazlı handler'lar), `db/`, `volume/`, `fs/`, `models/`, merkezî `error.rs` (`AppError` enum), `state.rs`.
- **İsimlendirme:** Rust `snake_case` (fonksiyon/değişken/modül/dosya), tip/enum/struct `PascalCase`, DB sütunları `snake_case`, Tauri komutları `snake_case`.
- **Sınır serileştirme:** `models/` struct'ları sözleşmedeki camelCase alanlara uymak için `#[serde(rename_all = "camelCase")]`. Sözleşmedeki tiplerle birebir eşleş.
- **Hata:** Tüm komutlar `Result<T, AppError>`. `AppError` serde ile `{ code, message, details? }` olarak serileşir (sözleşme §Hata kodları).
- **Uzun işlemler:** ilerlemeyi Tauri **event** ile yayınla (`import:progress` vb.), komut hızlı dönsün.

## Mimari kararlar (PRD v0.4 — sapma yok)
- **İki katman:** Dosyalar = içerik-adresli (BLAKE3) + sürümlü; Metadata = CRDT (Automerge). SQLite/FTS5 = bu CRDT'den türetilen **hızlı arama görünümü** (kaynak değil, indeks).
- **Depolama modeli:** fiziksel depolama + sanal navigasyon. Gerçek dosyalar `Library/Dosyalar/` altında okunabilir durur; `.yad/blobs/` içerik-adresli sürüm/sync deposu; `.yad/metadata/` Automerge; `.yad/index.db` SQLite; `.yad/export/` JSON yedeği (açık format). (PRD §4.2)
- **Çekirdek istif:** Iroh (`iroh` + `iroh-blobs` + `iroh-docs`) + Automerge. **iroh-blobs: kararlı 0.35 serisi** ile başla (mevcut 0.10x "not production quality"); sürüm/throughput'u M5 öncesi PoC ile doğrula. Custom QUIC transfer YAZMA.
- **Relay:** üretimde self-host; geliştirmede public relay. (M5)
- **Atıf:** her metadata mutasyonu **yazar (actor) bilgisi taşır** — günden bir. Geriye dönük atıf imkânsız.
- **Roller:** Owner / Editor / Viewer. Erişim = senkron katmanı (Viewer'a orijinal gönderilmez). (M5)
- **At-rest şifreleme YOK** (v1). Transit Iroh/QUIC ile şifreli.

## Test (definition of done)
- `cargo test` — her modül için birim testler; komutlar için entegrasyon testleri.
- `cargo clippy` temiz, `cargo fmt` uygulanmış.
- `cargo tauri dev` ile duman testi (uygulama açılır, komut çağrılabilir).
- Atomik dosya işlemleri için özel test (yarıda kesilme → geri alma).
- Küçük, anlamlı commit.

## Milestone sırası (00-overview ile aynı; BE yarısı)
- **M0:** Tauri boot, `AppError`, `state.rs`, SQLite init/migration altyapısı, **stub komutlar** (sözleşmedeki M0 + diğerleri boş/örnek döner) → FE entegrasyon için kontrat ayakta.
- **M1:** `library_*`, `volume_*` (`.yad/` oluştur, disk tanıma iskeleti), `import_files` (kopyala + BLAKE3 hash + thumbnail üret, `import:progress` yay), `file_list/get/rename/...`. Türetilmiş SQLite kayıtları.
- **M2:** Automerge metadata katmanı + SQLite görünüm senkronu; `tag_*`, `collection_*`, `person_*`, `note_*`, `file_set_rating*`, `tag_suggest` (9 öneri: mevcut etiket + zaman yakınlığı). Her mutasyon atıf taşır.
- **M3:** FTS5 indeks + `search`/`search_global`, filtreler (`SearchQuery` tüm alanları).
- **M4:** içerik-adresli sürüm geçmişi (`version_*`), aktivite/atıf (`activity_*`, `activity:new`), çöp kutusu (soft-delete + retention).
- **M5:** Iroh entegrasyonu (blobs + docs), davet linki üret/kabul, senkron, roller, çatışma (`conflict_*`), `sync:status`. **Önce iroh-blobs PoC benchmark'ı.**
- **M6:** `tauri-plugin-updater` + GitHub Releases, imza keypair, performans.

## Açık sorular (PRD §14b — planında ele al)
iroh-blobs sürüm/throughput PoC, discovery self-host gereksinimi, çalışma-kopyası ↔ blob senkron tutarlılığı (dış düzenleme/yeniden adlandırmada). M5'e gelmeden netleştir.

## Kapsam dışı (YAPMA)
Drive entegrasyonu, .yad export/import, plugin/MCP, ara roller (Contributor/Manager), otomatik klasör izleme, Supabase (kimlik saf-Iroh), WebRTC/STUN (yerine Iroh), at-rest şifreleme. Bunlar v1 dışı.
