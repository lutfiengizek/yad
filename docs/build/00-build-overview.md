# YAD — Build Genel Bakış & İki-Agent İşbirliği Modeli

**Versiyon:** 1.0 · **Tarih:** 13 Haziran 2026
**Amaç:** YAD'ı iki paralel agent (Frontend + Backend) ile, **önce planlayıp sonra adım adım, test ederek** inşa etmek.

> Bu doküman koordinasyon anayasasıdır. İki agent da işe başlamadan **tüm referans dokümanları** okur:
> - `yad-prd-v4.md` — ürün gereksinimleri & mimari kararlar
> - `docs/yad-wireframes-v1.md` — ekranlar & UX
> - `.claude/rules/architecture-rules.md` — proje yapısı, frontend-backend sınırı, isimlendirme
> - `.claude/rules/ui-rules.md` — shadcn iş akışı, renk/font/layout kuralları (yalnızca FE)
> - `docs/build/01-api-contract.md` — **paylaşılan sözleşme (en kritik)**
> - `docs/build/02-frontend-agent.md` / `03-backend-agent.md` — kendi brief'i

---

## 1. Temel ilke: Sınır = Sözleşme

Mimari zaten temiz ayrılmış (`architecture-rules.md`): **Frontend asla dosya sistemine/DB'ye dokunmaz**; her şey Tauri komutlarıyla (`invoke`) backend'den gelir. Bu yüzden iki agent şu sınırla çakışmadan çalışır:

| Agent | Dokunduğu yer | Asla dokunmadığı yer |
|-------|---------------|----------------------|
| **Frontend** | `src/` | `src-tauri/` |
| **Backend** | `src-tauri/` | `src/` |
| **Ortak** | `docs/build/01-api-contract.md` (tek hakikat kaynağı) | — |

**Tek temas noktası API sözleşmesidir.** Sözleşme değişecekse: önce `01-api-contract.md` güncellenir, kullanıcıya bildirilir, **iki agent da senkronlanır.** Tek taraflı sözleşme değişikliği yasaktır.

---

## 2. "Önce planla, sonra yap" akışı (her agent için zorunlu)

Her agent şu sırayı izler (onay kapısı YOK — doğrudan ilerler):

1. **Oku:** Yukarıdaki tüm referans dokümanları + kendi brief'i + sözleşme.
2. **Kısa plan yaz:** Kendine yön olsun diye bir plan dokümanı üretir (onay beklemez):
   - Frontend → `docs/build/plans/frontend-plan.md`
   - Backend → `docs/build/plans/backend-plan.md`
   - Plan içeriği: milestone bazında görev listesi, oluşturulacak/değişecek dosyalar, her görevin test yaklaşımı, "definition of done", riskler/açık sorular.
3. **Hemen uygula (adım adım):** Planı yazdıktan sonra **doğrudan** kodlamaya başlar. Her görevi tek tek yapar — **kod + test + lint + (FE) iki tema kontrolü + commit**. Bir görev "yeşil" olmadan sonrakine geçilmez.
4. **Milestone sonu entegrasyon:** Uygulama çalıştırılıp özellik uçtan uca doğrulanır.

> Yalnızca **gerçek bir belirsizlik/çelişki** (sözleşmede eksik tip, çakışan karar) varsa durur ve sorar. Aksi halde dokümanlara dayanıp ilerler.

---

## 3. Milestone'lar (iki agent aynı hizada ilerler)

Her milestone'da iki agent kendi yarısını yapar; sözleşme o milestone için **dondurulur**. Milestone sonunda entegrasyon kontrolü yapılır.

| # | Milestone | Backend yarısı | Frontend yarısı | Entegrasyon kontrolü |
|---|-----------|----------------|------------------|----------------------|
| **M0** | İskelet & sözleşme | Tauri boot, `AppError`, `state`, SQLite init, **stub komutlar** (boş/mock döner) | App shell (3-panel, Sidebar, Resizable, tema provider, i18n), **typed api client + mock katmanı**, yönlendirme | Uygulama açılır, boş kabuk **her iki temada** görünür |
| **M1** | Kütüphane & içe aktarma | Library/volume oluştur-aç, `.yad/` yapısı, import (kopyala + BLAKE3 + thumbnail), dosya listele/kaydet | Onboarding, kütüphane/volume sidebar, drag-drop + import kuyruğu, Grid/Liste, boş durumlar | Kütüphane kur → dosya sürükle → grid'de gör |
| **M2** | Organizasyon | Tag/koleksiyon/kişi/not/rating CRUD (Automerge metadata + SQLite görünüm), atıf | Inspector, etiket editörü (9 öneri, hiyerarşik), koleksiyon, kişi kartı, ProseMirror not, rating | Etiketle, koleksiyon yap, kişi ata, not yaz |
| **M3** | Arama & önizleme | FTS5 arama + filtreler | Ctrl+K komut paleti, filtreler, QuickPreview, Loupe/Karşılaştır | Ara çalışır, önizleme çalışır |
| **M4** | Sürüm & aktivite | İçerik-adresli sürüm geçmişi, aktivite/atıf, çöp kutusu | Geçmiş sekmesi, aktivite akışı, çöp kutusu | Eski sürüme dön, aktiviteyi gör |
| **M5** | P2P & işbirliği | Iroh (blobs+docs), davet linki, senkron, roller, çatışma | Üyeler, davet oluştur/katıl, çatışma modalı, senkron popover | İki cihaz arası senkron + davet |
| **M6** | Cila & dağıtım | Auto-update (tauri-plugin-updater), performans | Boş/hata/yükleme cilası, kısayollar, erişilebilirlik | Auto-update akışı, 2-cihaz testi |

> M0–M4 = PRD Faz 1 (yerel arşiv, tek kullanıcı). M5 = Faz 2/3 (P2P). M6 = cila. Sözleşme M0–M3'ü detaylı tanımlar; M4–M6 sırası geldiğinde detaylandırılır.

---

## 4. Mock stratejisi — agentlar birbirini BEKLEMESİN

Frontend, backend'i beklemeden geliştirebilmeli. Çözüm: **typed api katmanı + mock implementasyon** (detay: sözleşme dokümanı §Mock).

- `src/lib/api/` içinde: `types.ts` (sözleşme tipleri), `client.ts` (gerçek `invoke`), `mock.ts` (sahte veri), `index.ts` (anahtar).
- Bir ortam değişkeni / flag ile gerçek ↔ mock arası geçilir.
- Frontend tüm ekranları **mock veriyle** kurar ve test eder; backend ilgili komutu bitirince frontend gerçek `invoke`'a geçer (tip aynı olduğu için sürtünmesiz).

---

## 5. Test politikası (her iki agent için zorunlu)

| | Backend | Frontend |
|---|---------|----------|
| Birim test | `cargo test` (her modül) | `pnpm test` (Vitest + Testing Library) |
| Statik | `cargo clippy` temiz, `cargo fmt` | `pnpm lint` temiz, `tsc` hatasız (`pnpm build`) |
| Görsel | — | **Her değişiklik açık+koyu temada** test edilir (ui-rules) |
| Duman testi | `cargo tauri dev` ile açılır | Uygulamada elle akış denenir |
| Entegrasyon | Komut entegrasyon testleri | Milestone sonu uçtan uca |

**Definition of Done (her görev):** İlgili testler yazıldı + geçti, lint/format temiz, (FE) iki tema doğrulandı, küçük ve anlamlı bir commit atıldı.

---

## 6. Paralel çalışma kuralları (çakışmayı önler)

1. **Dosya bölgesi:** FE sadece `src/`, BE sadece `src-tauri/`. Karışmaz.
2. **Sözleşme dondurma:** Aktif milestone'un sözleşmesi sabittir. Değişiklik → doküman + kullanıcı onayı → iki agent sync.
3. **İsimlendirme:** `architecture-rules.md`'deki konvansiyonlar kesin (Rust snake_case, TS camelCase, komutlar snake_case). Sınır tiplerinde serde `rename_all = "camelCase"` ile TS camelCase görür.
4. **Küçük commit'ler:** Her görev kendi commit'i; mesajlar net.
5. **Kapsam disiplini:** PRD'de "sonraya" denen özellikler (Drive, .yad export, plugin/MCP, ara roller, otomatik import vb.) bu build'de YAPILMAZ.
6. **Kararlardan sapma yok:** Çekirdek istif (Iroh + Automerge), depolama modeli (fiziksel depolama + sanal navigasyon), saf-Iroh davet, solar-dusk teması — hepsi sabit (bkz. PRD v0.4).

---

## 6b. Git iş akışı (TEK DAL · KAPSAMLI COMMIT — çakışmayı önler)

> İki agent **tek bir ortak çalışma ağacı ve tek bir git HEAD** paylaşır. Bu yüzden git
> disiplini, dosya-bölgesi disiplini kadar kritiktir. Aşağıdaki kurallar zorunludur.

1. **Tek dal:** İkisi de `main` üzerinde çalışır. **Agent başına ayrı dal AÇILMAZ** —
   ortak HEAD tek olduğu için dal değiştiren agent, diğerinin ayağının altındaki ağacı
   kaydırır (komut/build kırılır, commit'ler yanlış dala düşer).
2. **`git add -A` / `git add .` / `git commit -a` YASAK.** Bu komutlar diğer agent'ın
   (belki yarım) dosyalarını süpürüp tek "bundle" commit'e tıkar, yanlış atıf üretir ve
   geçmişi karıştırır. **Her agent yalnızca kendi yolunu ekler:**
   - Backend: `git add src-tauri/`
   - Frontend: `git add src/`
   - Paylaşılan dosya (`docs/`, kök `*.md`, `*.config.*`, `tauri.conf.json`): **sadece o
     değişikliği yapan agent**, dosyayı **adıyla** ekler (`git add docs/build/01-api-contract.md`).
3. **Küçük, kapsamlı commit:** Her görev kendi commit'i. Mesaj agent + milestone belirtir
   (örn. `M1 backend: import_files + BLAKE3`). Co-author satırı korunur.
4. **Sık commit:** Bir görev yeşil olunca (test+lint) hemen commit'le; böylece yarım dosya
   ortak ağaçta açıkta kalmaz.
5. **Push yalnızca kullanıcı isteyince.** Geçmiş yeniden yazma (`reset --hard`, `rebase`,
   force-push) ortak/aktif repoda **yapılmaz**; gerekiyorsa tek agent yapar, diğeri durur.
6. **Karışıklık olursa "tek elden uzlaştırma":** Çelişki/yanlış-bundle fark edilirse
   agentlardan **biri git'e dokunmayı duraklatır**, diğeri tek başına uzlaştırır
   (içerik kaybı yok: her şey ya bir commit'te ya çalışma ağacındadır), sonra ikisi de
   yeniden `main`'de devam eder. Aynı anda iki agent git'e dokunmaz.

---

## 7. Dizin yapısı (referans)

```
yad/
├── src-tauri/src/   ← BACKEND agent bölgesi (architecture-rules §yapı)
│   ├── commands/  db/  volume/  fs/  models/  error.rs  state.rs
├── src/             ← FRONTEND agent bölgesi
│   ├── components/{ui,sidebar,content,inspector,shared}/
│   ├── hooks/  stores/  lib/{api}/  types/  i18n/
├── docs/
│   ├── yad-wireframes-v1.md
│   └── build/
│       ├── 00-build-overview.md      ← bu dosya
│       ├── 01-api-contract.md
│       ├── 02-frontend-agent.md
│       ├── 03-backend-agent.md
│       └── plans/                     ← agentların ürettiği planlar
└── yad-prd-v4.md
```

---

*Bu doküman değişirse versiyon artar ve iki agent da yeniden hizalanır.*
