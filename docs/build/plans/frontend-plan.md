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

## Durum
M0+M1 tamam: 21 test geçer, `tsc`/`pnpm build` temiz. Tümü mock üzerinde çalışır
(`VITE_USE_MOCK` varsayılan; onboarding'i görmek için `VITE_MOCK_EMPTY=true`).
Görsel açık/koyu tema piksel kontrolü çalışan uygulamada elle doğrulanmalı
(tarayıcı otomasyonu yok; tüm bileşenler token-tabanlı → yapısal olarak tema-uyumlu).

## Riskler
- Backend yok → tümü mock; `VITE_USE_MOCK=false` ile sonra doğrulanır.
- Sözleşme donmuş; değişiklik gerekirse önce contract + sync, sonra kod.
