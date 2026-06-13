# YAD — Gazeteciler ve Dergiciler İçin Dijital Arşiv Platformu

## Ürün Gereksinim & Teknik Mimari Belgesi

**Versiyon:** 0.4
**Tarih:** 13 Haziran 2026
**Uygulama Adı:** YAD
**Export Uzantısı:** `.yad` (Faz sonrası)
**Teknoloji:** Tauri v2 (Rust + React/TypeScript + shadcn/ui)
**Hedef Kitle:** Gazeteciler, dergiciler, editörler, arşivciler

> **v0.4 ne değiştirdi (v0.3'e göre özet):**
> - **Depolama modeli sadeleşti:** Rijit "uygulama ağacı = disk ağacı, iki yerdeyse fiziksel kopya" kuralı bırakıldı. Yerine **fiziksel depolama + sanal navigasyon** (hepsi YAD altında gerçek dosya, üstte sanal etiket/koleksiyon, diskte tek kopya).
> - **Çekirdek altyapı belirlendi:** P2P/transport/içerik-adresleme için **Iroh** (iroh + iroh-blobs + iroh-docs), zengin metadata + sürüm geçmişi için **Automerge** (CRDT). Referans mimari: **Spacedrive** (desen olarak).
> - **WebRTC + STUN + Supabase Realtime signaling kaldırıldı** → yerine Iroh (QUIC + hole-punching + relay yedeği).
> - **Kimlik merkezsizleşti:** Supabase Auth/merkezî RBAC kaldırıldı → **saf-Iroh davet linki**, sunucusuz. Roller sadeleşti: **Owner / Editor / Viewer**.
> - **Faz 2 (workspace + çok kullanıcı), Faz 1'e dahil edildi** — Iroh+Automerge aynı motor olduğu için ayrı yeniden yazım değil.
> - **Sürüm geçmişi + "kim ne değiştirdi" (yazar atfı)** çekirdek özellik oldu.
> - **Auto-update** (Tauri updater) eklendi. **At-rest disk şifreleme** v1 kapsamı dışı.
> - **Dosya kilitleme kaldırıldı** (CRDT eşzamanlı düzenlemeyi zaten çözüyor).

---

## 1. VİZYON

YAD, gazetecilerin ve dergicilerin yazılarını, görsellerini, ses kayıtlarını ve tüm dijital materyallerini **basit, güvenli ve merkeziyetsiz** bir şekilde arşivleyip yönetebilecekleri bir masaüstü uygulamasıdır.

**Tasarım öncelikleri (önem sırasıyla):**

1. **Basit** — Herkesin rahatça kullanabileceği kadar kolay. Klasör kurmadan, hesap açmadan: ekle, etiketle, ara.
2. **İşe yarar** — Gazetecinin gerçek iş akışına (konu/kişi/olay düşünmek) hizmet eder.
3. **Güvenli** — Veri kaybolmaz, transit şifrelidir, erişim kontrollüdür.

**Temel ilkeler:**

1. **Hiçbir şey kaybolmamalıdır.** Dosyalar diskte gerçek, okunabilir dosyalar olarak yaşar; YAD silinse bile klasör açılınca her şey oradadır.
2. **Veriler dosyaların yanında yaşar.** Metadata (etiketler, notlar, kişiler) dosyaların yanında saklanır. Bir diski alıp başka bilgisayara taktığında her şey orada olur.
3. **Merkeziyetsiz ama mahrem.** Veri önce yerelde yaşar, kullanıcılar arasında doğrudan (P2P) eşler. Bulut sunucu, blockchain, token, herkese-açık ağ yoktur.

---

## 2. TEKNİK STACK

| Katman | Teknoloji | Rol |
|--------|-----------|-----|
| Desktop Shell | **Tauri v2** | Uygulama kabuğu, native pencere, IPC |
| Frontend | **React + TypeScript + shadcn/ui** | UI render, etkileşim, durum |
| Backend Logic | **Rust** (Tauri commands) | Dosya işlemleri, DB, P2P, güvenlik — tek otorite |
| Yerel veritabanı | **SQLite + FTS5** | Hızlı sorgu/arama indeksi (türetilmiş görünüm) |
| Metadata CRDT | **Automerge** (Rust core, MIT) | Etiket/not/kişi çatışmasız birleştirme + tüm sürüm geçmişi |
| İçerik-adresli depo & transfer | **iroh-blobs** (BLAKE3) | Büyük medya, dedup, bütünlük, sürüm blob'ları |
| P2P ağ | **iroh** (QUIC + NAT hole-punching + relay yedeği) | Doğrudan cihazlar-arası bağlantı |
| Doküman/senkron senkron taşıyıcı | **iroh-docs / iroh-gossip** | Automerge update'lerini ve namespace'leri taşıma |
| Zengin metin notlar | **ProseMirror** | Not editörü |
| Otomatik güncelleme | **tauri-plugin-updater** + GitHub Releases | İmzalı auto-update |

**Kaldırılanlar (v0.3'ten):** Supabase (Auth/Postgres/Realtime), WebRTC DataChannel, STUN sunucu listesi, harici TURN tartışması.

**Ağ politikası:** Iroh önce yerel ağda mDNS ile keşfeder ve doğrudan QUIC bağlantısı dener, gerekirse NAT hole-punching yapar, başarısız olursa relay'e düşer. **Relay üretimde self-host edilir** (gazeteci mahremiyeti — bkz. §8.3 ve §9). Geliştirmede n0 public relay'leri kullanılabilir; üretimde kullanılmaz.

> **Sürüm notu (araştırma ile doğrulandı):** iroh `v1.0.0-rc.1` (May 2026), Automerge `v3.2.6` (Nis 2026). **iroh-blobs:** mevcut geliştirme serisi (0.90–0.102) maintainer'ların ifadesiyle "henüz üretim kalitesi değil"; üretim için **kararlı 0.35 serisi** öneriliyor. Geliştirme öncesi sürüm seçimi (0.35 vs 0.10x) ve gerçek transfer hızı **PoC benchmark'ı ile** doğrulanmalı. Çekirdek transfer mimarisi (BLAKE3 verified streaming, content-addressing, resumability, GB-ölçeği diske-streaming) sağlam — **custom QUIC transferi yazmaya gerek yok.**

---

## 3. ÇEKİRDEK MİMARİ: İKİ KATMAN

YAD'ın verisi birbirini tamamlayan iki katmanda yaşar:

```
┌─────────────────────────────────────────────────────────┐
│ KATMAN 1 — DOSYALAR (içerik-adresli + sürümlü)           │
│  · Gerçek, okunabilir dosyalar YAD kütüphanesinde         │
│  · BLAKE3 hash ile dedup / bütünlük / sürüm geçmişi       │
│  · iroh-blobs ile P2P transfer                            │
├─────────────────────────────────────────────────────────┤
│ KATMAN 2 — METADATA (CRDT)                                │
│  · Etiket, koleksiyon, kişi kartı, not, rating, atıf      │
│  · Automerge: çatışmasız birleşme + tüm geçmiş            │
│  · SQLite/FTS5 = bu CRDT'den türetilen hızlı arama görünümü│
└─────────────────────────────────────────────────────────┘
```

**Neden iki katman?** Dosyalar büyük ve değişmez (immutable) bloklar olarak içerik-adresiyle iyi yönetilir; metadata ise küçük, sık değişen ve eşzamanlı düzenlenen veridir, CRDT ile iyi yönetilir. Bu ayrım, senin iki isteğini de tek mimaride karşılar: **git-benzeri sürüm geçmişi** (Katman 1 + Automerge geçmişi) **ve** **çatışmasız çoklu-cihaz senkron** (Katman 2).

---

## 4. DEPOLAMA MODELİ: FİZİKSEL DEPOLAMA + SANAL NAVİGASYON

### 4.1 Temel kural

| Konu | Karar |
|------|-------|
| **Fiziksel DEPOLAMA** | ✅ Var. Dosyalar diskte gerçek, okunabilir dosyalar olarak durur. |
| **Fiziksel NAVİGASYON** | ❌ Yok. Uygulamadaki ağaç = disk ağacı zorunluluğu kaldırıldı. |
| **Organizasyon** | Sanal: etiketler + koleksiyonlar. |
| **Bir dosya birden çok yerde** | Sanal (diskte **tek kopya**). Fiziksel kopya yapılmaz. |
| **Ekleme** | Varsayılan: kütüphaneye **kopyala**. Opsiyonel: dış dosyayı **referansla** (güç-kullanıcı). |

**Sonuç:** Kullanıcı klasör mimarisi kurmak zorunda değildir. "Ekle, etiketle, ara." Aynı dosya 5 koleksiyonda görünebilir ama disk israfı veya "taşıdım, gitti mi?" paniği olmaz.

### 4.2 Disk yapısı (açık format)

```
YAD-Kütüphanesi/                  (iç disk, harici disk veya USB olabilir)
├── .yad/
│   ├── volume-id.json            ← Kütüphane kimliği (Iroh namespace + node bilgisi)
│   ├── index.db                  ← SQLite/FTS5: aramadan türetilen hızlı görünüm
│   ├── metadata/                 ← Automerge doküman(lar)ı (etiket/not/kişi/atıf + geçmiş)
│   ├── blobs/                    ← iroh-blobs içerik-adresli depo (sürüm geçmişi + sync chunk'ları)
│   ├── thumbnails/               ← Önizleme cache (BLAKE3 adlı .webp)
│   └── export/                   ← İnsan-okur metadata yedeği (JSON snapshot)
└── Dosyalar/                     ← Gerçek, okunabilir dosyalar (mevcut hâl)
    ├── deprem-001.jpg
    ├── roportaj-bakan.mp3
    └── ...
```

- **Çalışma kopyası gerçek dosyadır:** `Dosyalar/` altındaki dosyalar normal, herhangi bir programla açılabilir dosyalardır → "hiçbir şey kaybolmaz".
- **`.yad/blobs/`** içerik-adresli depo, **eski sürümleri** ve P2P transfer parçalarını tutar (kullanıcıya görünmez iç mekanizma).
- **`.yad/export/`** uygulama olmasa bile metadata'nın okunabilir JSON yedeğini tutar (açık format garantisi).

### 4.3 Sürüm geçmişi

- Bir dosya değiştiğinde (örn. dışarıda düzenlenip geri konduğunda) yeni içerik yeni bir BLAKE3 hash'le `blobs/`'a eklenir; eski sürüm korunur.
- Metadata değişiklikleri Automerge tarafından zaten tüm geçmişiyle saklanır.
- Kullanıcı bir dosyanın/notun **eski hâline dönebilir** ("hiçbir şey kaybolmasın").

---

## 5. VOLUME & TAŞINABİLİRLİK

### 5.1 Volume nedir?

Volume = bir YAD kütüphanesinin bulunduğu fiziksel birim. İç disk, harici disk veya USB olabilir. Her volume kendi `.yad/` klasörünü (kimlik + metadata + blob deposu) taşır.

### 5.2 Taşınabilirlik

- Bir volume'u başka bilgisayara taktığında metadata **yanındadır** (`.yad/metadata/` + `.yad/blobs/`), çünkü dosyaların yanında yaşar.
- Disk takıldığında YAD `.yad/` klasörünü tespit eder, volume kimliğini okur ve içeriği gösterir.
- Disk çıkarıldığında o volume "çevrimdışı" görünür; diğer volume'lar erişilebilir kalır.

### 5.3 Kademeli disk tanıma

```
DİSK TAKILDI → .yad/ var mı? → volume-id.json oku → (arkaplan) bütünlük taraması → BAĞLANDI
```

Eksik/değişmiş dosyalar (BLAKE3 doğrulama) sarı uyarıyla işaretlenir.

---

## 6. İÇERİK TOPLAMA & ORGANİZASYON

### 6.1 İçerik toplama (v1)

| Özellik | Açıklama |
|---------|----------|
| Drag & Drop | Dosya yöneticisinden sürükle-bırak → kütüphaneye kopyala |
| Clipboard | Kopyala-yapıştır ile görsel/metin ekleme |
| Kaynak URL | Her dosyaya orijinal kaynak URL'si kaydedilebilir |
| Referans modu (ops.) | "Sadece bağlantı olarak ekle" — dosya erişilemezse sarı uyarı |

### 6.2 Organizasyon (v1)

| Özellik | Açıklama |
|---------|----------|
| **Etiketler** | Kişi / zaman / olay / yer / serbest (bkz. 6.3) |
| **Koleksiyonlar** | Sanal gruplar; bir dosya çok koleksiyonda, diskte tek kopya |
| **Kişi kartları** | Ayrı kişi veritabanı, N:N ilişki (bkz. 6.3) |
| **Notlar** | ProseMirror zengin metin |
| **Rating** | 1–5 yıldız |
| **Toplu işlemler** | Toplu seç, etiketle, yeniden adlandır |
| **Harici editör** | Sistem varsayılan uygulamasında aç |

### 6.3 Etiketleme & kişi kartları

**Etiket türleri:** Kişi, Zaman, Olay, Yer, Serbest.

**Kişi kartı:** ad, soyad, unvan, kurum, iletişim, fotoğraf, notlar. Kişiler ↔ dosyalar N:N. Kişi sayfasından tüm dosyaları, dosya sayfasından tüm kişileri görüntüleme.

**Çapraz filtreleme:** "Ahmet Yılmaz" + "2024" + "Deprem" → kesişim.

### 6.4 Arama (v1)

| Özellik | Açıklama |
|---------|----------|
| Keyword Search | FTS5 full-text (<0.5 sn) |
| Filter | Format, boyut, kişi, olay, zaman, yer, etiket, rating |
| Quick Search | Ctrl/Cmd+K ile anında arama |

### 6.5 Önizleme (v1)

| Grup | Formatlar | Mod |
|------|-----------|-----|
| Görsel | JPG, PNG, GIF, WebP, SVG, BMP, TIFF, HEIC | Dahili viewer |
| Video | MP4, MOV, AVI, MKV, WebM | Dahili player |
| Ses | MP3, WAV, AAC, FLAC, M4A | Player + waveform |
| Doküman | PDF, DOCX, TXT, MD, HTML | Salt okunur reader |
| Diğer | Tümü | Jenerik ikon + metadata |

**Düzenleme politikası:** YAD arşiv uygulamasıdır. İçerik düzenlenmez, görüntülenir. Düzenleme için "Harici uygulamada aç".

---

## 7. ÇOK KULLANICI & İŞBİRLİĞİ

> Faz 2, Faz 1'e dahildir. Aynı Iroh+Automerge motoru üzerinde "senkron açık" hâlidir.

### 7.1 Kimlik — saf Iroh (sunucusuz)

- Her kullanıcı/cihaz bir **anahtar çiftine** (Iroh NodeId) sahiptir.
- Merkezî hesap/sunucu yoktur (Supabase yok).
- Görünen ad (display name) kullanıcı profilinde belirlenir; gerçek kimlik çapası **anahtardır**.

### 7.2 Davet — link/bilet ile

- Owner bir **davet linki/bileti** üretir (WhatsApp/e-posta ile paylaşılabilir).
- Davet edilen linkle workspace'e katılır; kimliği (anahtar + görünen ad) kurulur.
- "Kullanıcı adından bul" özelliği yoktur (merkezî rehber gerektirir; bilinçli olarak kapsam dışı).

### 7.3 Roller (RBAC) — 3 rol

| Rol | Görüntüle | Etiket/Not Düzenle | Dosya Ekle | Dosya Sil/Taşı | WS Yönetimi |
|-----|:---------:|:------------------:|:----------:|:--------------:|:-----------:|
| **Viewer** | ✅ (thumbnail+metadata) | ❌ | ❌ | ❌ | ❌ |
| **Editor** | ✅ (tam) | ✅ | ✅ | ✅ | ❌ |
| **Owner** | ✅ (tam) | ✅ | ✅ | ✅ | ✅ |

### 7.4 Erişim = senkron katmanı (güvenlik gerçeği)

P2P'de "okuma izni" = **"sana hangi veriyi gönderdiğim"**. Bu yüzden roller senkron katmanlarına eşlenir:

- **Viewer** → yalnızca thumbnail + metadata senkronlanır; orijinal dosya **talep üzerine** stream edilir.
- **Editor / Owner** → tam dosya kopyası + metadata senkronlanır.

Bir veri birine senkronlandıysa artık onun diskindedir — bu sınır bilinçli tasarlanmıştır.

### 7.5 Kim ne değiştirdi (atıf & aktivite)

- Automerge her mutasyonu **actor-ID + zaman damgası** ile saklar.
- Değişiklikler kişinin **anahtarıyla kriptografik imzalı** → sahte atıf imkânsız.
- Gösterimler: **aktivite akışı** (workspace geneli) + **dosya başına yazarlı sürüm geçmişi**.
- **Kural:** Her mutasyon günden bir yazar bilgisi taşır (geriye dönük atıf imkânsız olduğu için baştan tasarlanır).

---

## 8. P2P SENKRONİZASYON (IROH)

### 8.1 Akış

```
┌────────────┐     iroh discovery / relay      ┌────────────┐
│  Peer A    │◄──── (bağlantı kurulumu) ──────►│  Peer B    │
│  (Tauri)   │◄════ QUIC (P2P, şifreli) ══════►│  (Tauri)   │
└────────────┘   iroh-blobs + Automerge update  └────────────┘
```

1. Aynı workspace üyeleri Iroh ağında birbirini keşfeder (yerel ağda mDNS, uzakta discovery/pkarr; NodeId ile).
2. QUIC bağlantısı kurulur (önce doğrudan/hole-punch, son çare **self-hosted relay**).
3. **Metadata:** Automerge update'leri iroh kanalından akar, çatışmasız birleşir.
4. **Dosyalar:** iroh-blobs ile BLAKE3-doğrulamalı transfer (role göre tam/thumbnail).
5. Bağlantı kurulamazsa anlaşılır hata: *"Doğrudan bağlantı kurulamadı."*

### 8.2 Çatışma çözümü

| İşlem | Çözüm |
|-------|-------|
| Dosya ekleme | İçerik-adresli (BLAKE3), çatışma yok |
| Etiket/koleksiyon | Automerge CRDT — additive, çatışmasız birleşir |
| Not düzenleme | Automerge CRDT — eşzamanlı düzenleme otomatik birleşir (kilit YOK) |
| Rating/alan | Automerge deterministik çözüm, kaybeden değer geçmişte erişilebilir |
| Dosya silme | Soft-delete; diğer peer'larda onay gerekli, 30 gün çöp kutusu |

**Not:** iroh-docs tek başına last-writer-wins'tir; zengin etiket/not birleştirme **Automerge** ile yapılır (iroh sadece taşıyıcı).

### 8.3 Altyapı: relay & discovery (araştırma kararı)

| Bileşen | Karar | Gerekçe |
|---------|-------|---------|
| **Relay** | Üretimde **self-host**. Geliştirmede n0 public relay. | Public relay'ler dev/test için (rate-limit, SLA yok, paylaşımlı). Self-host basit: public IP + DNS + dahili ACME TLS, stateless (DB yok), ucuz. |
| **Discovery** | Yerel ağ: mDNS (sunucusuz). Uzak: pkarr/iroh-dns — tam mahremiyet gerekirse self-host. | Node'ların NodeId ile birbirini bulması için gerekir. |
| **İçerik gizliliği** | Uçtan-uca şifreli (QUIC/TLS 1.3) — relay içeriği göremez. | — |
| **Metadata** | Relay; IP, bağlantı zamanı, byte sayısı görebilir → bu yüzden **public relay üretimde kullanılmaz.** | Gazeteci tehdit modeli için IP/zamanlama hassas. |

> **Doğrulama notları:** "Hole-punching %90 başarılı" iddiası araştırmada **çürütüldü/doğrulanamadı** — relay sandığımızdan daha sık devreye girebilir; bu yüzden relay güvenilirliği (self-host) önemlidir. Gerçek relay-fallback oranı hedef ağ ortamlarında (kurumsal NAT, CGNAT, mobil) ölçülmeli.

---

## 9. GÜVENLİK

| Senaryo | Koruma |
|---------|--------|
| Uygulama çökmesi/kaldırılması | Dosyalar düz klasörde gerçek dosya; JSON metadata yedeği okunabilir |
| Disk bozulması | Diğer volume'lar + peer kopyaları + içerik-adresli bütünlük |
| Transit (ağ) güvenliği | Iroh/QUIC uçtan uca şifreli (relay içeriği göremez) |
| Bağlantı metadata'sı (IP/zaman) | Self-hosted relay + LAN'da mDNS; public relay üretimde kullanılmaz |
| Atıf sahteciliği | Değişiklikler anahtarla imzalı, kriptografik doğrulanabilir |
| Yetkisiz okuma | Erişim = senkron katmanı; Viewer'a orijinal gönderilmez |
| İnternet kesilmesi | Tamamen yerel çalışır; bağlanınca delta senkron |

**Kapsam dışı (v1):** At-rest (disk) şifreleme — kullanım sürtünmesi nedeniyle ertelendi.

---

## 10. OTOMATİK GÜNCELLEME (AUTO-UPDATE)

- **tauri-plugin-updater** ile imzalı auto-update.
- **Barındırma:** GitHub Releases (ücretsiz, en kolay).
- **İmza:** Tauri update keypair'i ile güncelleme bütünlüğü garanti.
- **Kod imzalama:** Windows'ta sertifika başta opsiyonel (SmartScreen uyarısıyla yaşanır), sonra alınır.
- Erken kurulur (altyapı işi).

---

## 11. UI/UX

### 11.1 Ana ekran

```
┌──────────────┬──────────────────────────┬──────────────┐
│ SOL PANEL    │ ORTA ALAN                │ SAĞ PANEL    │
│              │                          │              │
│ 🔍 Arama     │ Dosya Grid/Liste          │ 📷 Önizleme   │
│ 📚 Kütüphane │ (Justified/Grid/List)    │ 🏷️ Etiketler  │
│ 🗂️ Koleksiyon│                          │ 👤 Kişiler    │
│ 🏷️ Etiketler  │                          │ 📝 Not (Prose) │
│ 👤 Kişiler   │                          │ 🔗 URL        │
│ 📀 Volume'lar │                          │ ⭐ Rating     │
│   🟢 Ana Disk │                          │ 🕘 Geçmiş     │
│   🔴 USB     │                          │ 👥 Atıf       │
└──────────────┴──────────────────────────┴──────────────┘
┌─────────────────────────────────────────────────────────┐
│ 📀 2 volume (1 bağlı) │ 🟢 1 peer çevrimiçi │ 🔄 Güncel │
└─────────────────────────────────────────────────────────┘
```

### 11.2 Kişi kartı

```
┌────────────────────────────────────┐
│ 📷 [Fotoğraf]                      │
│ Ahmet Yılmaz                       │
│ Genel Yayın Yönetmeni — Gazete X   │
│ 📧 ... 📱 ...                      │
│ İlişkili dosyalar: 47              │
│ 📝 Notlar: ...                     │
└────────────────────────────────────┘
```

---

## 12. KAPSAM (v1)

### ✅ v1'e dahil
- Kütüphane/volume (iç/harici disk, USB), açık format
- Ekleme: sürükle-bırak, clipboard, kaynak URL
- Sanal organizasyon: etiketler + koleksiyonlar
- Kişi kartları, notlar (ProseMirror), rating
- Arama: FTS5 + filtreler + Ctrl+K
- Önizleme: görsel/video/ses/PDF/doküman
- Toplu işlemler, harici uygulamada aç
- Sürüm geçmişi + kim-ne-değiştirdi (atıf)
- Çok kullanıcı: Iroh davet linki, 3 rol, senkron, aktivite akışı
- Auto-update

### ⬜ Sonraya
- Google Drive entegrasyonu
- `.yad` export/import
- Plugin sistemi + MCP server
- Klasör izleyip otomatik import
- Video bookmark (YouTube/Vimeo)
- Reverse image search · renk araması · rastgele mod
- Klasör parola koruması / at-rest şifreleme
- Ara roller (Contributor / Manager)
- "Kullanıcı adından bul" rehberi (merkezî bileşen gerekir)

### ❌ Mimari değişikliğiyle gereksizleşen
- Dosya kilitleme (→ CRDT)
- Supabase Auth / merkezî RBAC (→ saf-Iroh)
- WebRTC + STUN + signaling (→ Iroh)

---

## 13. YOL HARİTASI (öneri)

| Aşama | Kapsam |
|-------|--------|
| **A. Çekirdek motor** | Tauri iskeleti, Rust depolama katmanı (içerik-hash + Automerge metadata), SQLite/FTS5 türetilmiş görünüm, "her mutasyon yazar taşır" kuralı |
| **B. Yerel arşiv UX** | Ekleme, kütüphane, etiket/koleksiyon, kişi, not, rating, arama, önizleme, toplu işlem |
| **C. Sürüm & geçmiş** | Sürüm geçmişi, eski hâle dönme, aktivite akışı, atıf gösterimi |
| **D. P2P & çok kullanıcı** | Iroh entegrasyonu, davet linki, 3 rol, senkron, erişim=senkron katmanı |
| **E. Cila & dağıtım** | Auto-update, hata mesajları, performans, 2-cihaz senaryosu testleri |

---

## 14. ÇÖZÜLEN KARARLAR (araştırma)

- ✅ **iroh-blobs kullanılır, custom transfer yazılmaz.** Çekirdek mimari (BLAKE3 verified streaming, content-addressing, resumability, GB-ölçeği diske-streaming) büyük medya için yeterli. Sürüm seçimi (kararlı 0.35 vs yeni 0.10x) ve gerçek hız PoC benchmark'ı ile netleşecek.
- ✅ **Relay üretimde self-host edilir.** Public n0 relay sadece dev/test; self-host basit ve stateless. İçerik uçtan-uca şifreli; metadata (IP/zaman) sızıntısı gazeteci için kritik olduğundan public relay üretimde kullanılmaz.

## 14b. AÇIK SORULAR

1. **iroh-blobs sürüm/throughput PoC:** Kararlı 0.35 mi yoksa yeni 0.10x mi? GB-ölçeği tek-dosya gerçek hız hedef donanım/ağda ne? (issue #4286'daki LAN tavanı çözüldü mü, çoklu-stream gerekir mi?) — **erken benchmark şart.**
2. **Discovery self-host:** Tam mahremiyet için pkarr/iroh-dns discovery'yi de self-host etmeli miyiz, yoksa self-hosted relay + LAN mDNS yeterli mi? (Discovery'nin NodeId↔IP metadata sızıntısı değerlendirilmeli.)
3. **Hole-punch gerçek oranı:** Hedef ağ ortamlarında (kurumsal NAT, CGNAT, mobil) relay-fallback oranı bağımsız ölçülmeli.
4. **Çalışma kopyası ↔ blob senkron:** `Dosyalar/` (gerçek dosya) ile `.yad/blobs/` (sürüm deposu) arasındaki ilişki dış düzenleme/yeniden adlandırmada nasıl tutarlı kalır?
5. **Spacedrive deseni:** Hangi spesifik modüller (indexer, BLAKE3 adaptive hashing, Iroh entegrasyon katmanı) kod değil **desen** olarak güvenle örnek alınır? (Lisans: AGPL-3.0 — kod ödünç alınmaz.)
6. **Ücretlendirme modeli:** Henüz karar verilmedi.

---

## 15. SONRAKI ADIMLAR

1. ✅ Mimari kararlar (v0.4)
2. ⬜ Iroh + Automerge entegrasyon PoC (özellikle iroh-blobs transfer benchmark'ı)
3. ⬜ Veri modeli tasarımı (Automerge doküman şeması + SQLite türetilmiş görünüm)
4. ⬜ Tauri proje iskeleti + auto-update kurulumu
5. ⬜ Çekirdek motor (Aşama A) geliştirme başlangıcı

---

*YAD PRD v0.4 — Her değişiklik versiyon numarasıyla takip edilir.*
