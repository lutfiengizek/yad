# Frontend Build Planı

> Tek hakikat kaynağı: `docs/build/01-api-contract.md`. Bu plan onun uygulama sırasıdır.
> Bu oturum kapsamı: **M0 + M1**. M2–M6 sırası gelince.

## Çalışma kuralları
- Yalnızca `src/` altında çalış (`src-tauri/` backend agent'ın).
- Komponentler `invoke`'u doğrudan çağırmaz — her zaman `src/lib/api/` katmanı.
- Backend hazır olmayan komut → mock (`VITE_USE_MOCK` veya Tauri yokluğu).
- Renk yalnızca `globals.css` token'ı; font yalnızca Oxanium/Merriweather/Fira Code.
- Tüm metin `src/i18n/` key-tabanlı, Türkçe-öncelikli.
- DoD: `pnpm test` geçer, `pnpm build` (tsc) hatasız, açık+koyu tema, küçük commit.
  (Not: repoda ayrı `lint` scripti yok; statik kapı = `tsc`/`pnpm build`.)

## M0 — İskelet & Sözleşme ✓
- [x] M0.1 `lib/api/types.ts` — sözleşme tipleri; `types/index.ts` re-export.
- [x] M0.2 `lib/api/{client,mock,mock-fixtures,events,index}.ts` — M0 komutları + seçici.
- [x] M0.3 `providers/theme-provider.tsx` + shell tema toggle (next-themes).
- [x] M0.4 App shell: `components/shell/{top-bar,status-bar}.tsx`.
- [x] M0.5 `i18n/tr.ts` genişletme + `stores/settings-store.ts` (library-store M1.3'e taşındı).

## M1 — Kütüphane & İçe Aktarma ✓
- [x] M1.1 API katmanı M1 komutları (library/volume/import/file) + import:progress mock.
- [x] M1.2 `components/onboarding/onboarding-wizard.tsx` (3 adım).
- [x] M1.3 `components/sidebar/app-sidebar.tsx` gerçek veri + library/volume/file store.
- [x] M1.4 `components/content/{content-area,file-grid,file-list}.tsx` + empty/skeleton.
- [x] M1.5 `components/content/import-queue.tsx` + drag-drop overlay + Toaster.

## M2 — Organizasyon ✓
- [x] M2.1 API katmanı M2 komutları (tag/collection/person/note/rating) + tag/collection/person store.
- [x] M2.2 Inspector sekmeleri (Künye/Geçmiş/Atıf) + düzenlenebilir rating.
- [x] M2.3 Etiket editörü (ata/oluştur/öneri) + sidebar hiyerarşik etiketler.
- [x] M2.4 Koleksiyonlar (sidebar liste/oluştur + inspector ekle/çıkar).
- [x] M2.5 Kişi kartları (inspector bağla/oluştur + sidebar + detay sayfası, route).
- [x] M2.6 ProseMirror not editörü (tiptap, Merriweather).

## M3 — Arama & Önizleme ✓
- [x] M3.1 API search + search_global (mock).
- [x] M3.2 Ctrl+K komut paleti (çok-tipli, kategorili).
- [x] M3.3 QuickPreview (Space) + çift-tık.
- [x] M3.4 Filtre (tür/rating/çevrimdışı) + sıralama; file-store base+filters.
- [x] M3.5 Loupe (E) + Karşılaştır (C) + tek-tuş kısayollar (G/L/E/C).

## M4 — Sürüm & Aktivite & Çöp ✓
- [x] M4.1 API version/activity/trash + activity/trash store + activity:new event.
- [x] M4.2 Sürüm geçmişi (inspector Geçmiş): zaman çizgisi + sürüme dön.
- [x] M4.3 Aktivite akışı (gruplu, i18n cümleler, geri al); status-bar zili açar.
- [x] M4.4 Çöp kutusu (geri al / kalıcı sil) + sidebar girişi + Del kısayolu.

## M5 — P2P & İşbirliği ✓
- [x] M5.1 API collab tipleri (SyncStatus/MemberInfo/Conflict, backend ile birebir) + komutlar + mock + collab store.
- [x] M5.2 Üyeler paneli (rol/online), davet oluştur (rol+süre→link), davete katıl.
- [x] M5.3 Senkron popover (alt çubuk) + çatışma çözüm modalı (mine/theirs/merge).
- [x] M5.4 Viewer salt-okunur gating; entegrasyon cilası: rename/reveal/source-url/profil (kullanılmayan komutlar bağlandı).

## M6 — Cila & Dağıtım ✓
- [x] M6.1 Ekran/bileşen tutarlılık denetimi (Explore audit).
- [x] M6.2 Ayarlar sayfası: dağınık ayarlar tek diyalogta (tema/dil/görünüm/yoğunluk/rozet/çöp/oto-güncelleme), Settings ikonu işlevsel.
- [x] M6.3 Klavye kısayolları referansı (? tuşu) + auto-update API (mock stub; backend yok).
- [x] M6.4 Paylaşılan EmptyState; sayfa başlıkları h-12 hizalı.
- [x] M6.5 Lazy-load (tiptap not editörü + route sayfaları) + vendor-radix chunk; başlangıç 434kB.

## Tasarım cilası (kullanıcı geri bildirimi)
Sidebar/topbar/statusbar/inspector tutarlılığı: etkileşimsiz metin butona sarılmaz,
placeholder'lar temiz, çalışma alanı aktif kütüphane adını gösterir. Token-tabanlı,
hardcoded renk yok.

## Durum
M0–M6 tamam: 57 test geçer, `tsc`/`pnpm build` temiz (chunk uyarısı yok). Tüm backend komutları FE'de bağlı.
Tarayıcıda mock; Tauri içinde otomatik gerçek `invoke` (`shouldUseMock` Tauri'yi algılar).
`VITE_USE_MOCK=false`/`true` ile zorla; onboarding'i görmek için `VITE_MOCK_EMPTY=true`.
Görsel açık/koyu tema piksel kontrolü çalışan uygulamada elle doğrulanmalı
(tarayıcı otomasyonu yok; tüm bileşenler token-tabanlı → yapısal olarak tema-uyumlu).

## Riskler
- Backend yok → tümü mock; `VITE_USE_MOCK=false` ile sonra doğrulanır.
- Sözleşme donmuş; değişiklik gerekirse önce contract + sync, sonra kod.
