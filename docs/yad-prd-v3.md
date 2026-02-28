# YAD — Gazeteciler ve Dergiciler İçin Dijital Arşiv Platformu

## Ürün Tanıtım Dokümantasyonu & Teknik Mimari Belgesi

**Versiyon:** 0.3
**Tarih:** 28 Şubat 2026
**Uygulama Adı:** YAD
**Export Uzantısı:** `.yad`
**Teknoloji:** Tauri v2 (Rust + React/TypeScript + shadcn/ui)
**Hedef Kitle:** Gazeteciler, dergiciler, editörler, arşivciler

---

## 1. VİZYON

YAD, gazetecilerin ve dergicilerin yazılarını, görsellerini, ses kayıtlarını ve tüm dijital materyallerini güvenli, esnek ve merkeziyetsiz bir şekilde arşivleyip yönetebilecekleri bir masaüstü uygulamasıdır.

**Temel ilkeler:**

1. **Hiçbir şey kaybolmamalıdır.**
2. **Gördüğün şey gerçek olandır.** Uygulama içindeki her klasör ve dosya, dosya sisteminde birebir fiziksel karşılık bulur. Sanal bağlantı, sanal klasör yoktur.
3. **Veriler her yerde olur.** Metadata (etiketler, notlar, kişiler) dosyaların yanında yaşar. Bir diski alıp başka bilgisayara taktığında her şey orada olur.

---

## 2. TEKNİK STACK

| Katman | Teknoloji |
|--------|-----------|
| Desktop Shell | Tauri v2 |
| Frontend | React + TypeScript + shadcn/ui |
| Backend Logic | Rust (Tauri commands) |
| Veritabanı (lokal) | SQLite + FTS5 |
| Auth & Uzak DB | Supabase (Auth + PostgreSQL + Realtime) |
| P2P Bağlantı | WebRTC DataChannel |
| NAT Traversal | Google/Mozilla ücretsiz STUN sunucuları |
| Signaling | Supabase Realtime |
| Cloud Backup | Google Drive API |
| Zengin Metin Notlar | ProseMirror |
| Plugin Sistemi | JavaScript/TypeScript |
| MCP Desteği | MCP Server entegrasyonu |

**Ağ politikası:** STUN başarısız olursa (katı firewall / symmetric NAT) hata mesajı gösterilir. Relay/TURN kullanılmaz.

---

## 3. TEMEL MİMARİ KAVRAM: VERİ VOLUME'DA YAŞAR

### 3.1 Geleneksel Yaklaşım (Eagle, vs.)

```
[Uygulama DB] ← tek merkez, metadata burada
     ↓
[Dosyalar] ← opak kütüphane yapısı
```

Sorun: Uygulamasız dosyalar anlamsız. Diski alıp başka yere götüremezsin.

### 3.2 YAD Yaklaşımı

```
[Volume] = dosyalar + metadata + etiketler + kişi kartları
     ↓
  Her şey birlikte yaşar. Volume taşınabilir bir birimdir.
```

Her volume kendi SQLite veritabanını ve dosyalarını taşır. Bir volume'u alıp başka bilgisayara taktığında YAD onu tanır ve tüm etiketleri, notları, kişi eşleştirmelerini gösterir.

### 3.3 Fiziksel Eşleşme Prensibi

> **YAD'da sanal hiçbir şey yoktur.** Cross-reference yoktur. Uygulama içinde gördüğün her klasör, her dosya, dosya sisteminde fiziksel olarak vardır.

| İşlem | Uygulama İçi | Dosya Sisteminde |
|-------|-------------|-----------------|
| Klasör oluştur | Yeni klasör görünür | Fiziksel klasör oluşturulur |
| Dosya taşı (A → B) | Dosya B'ye taşınır | `mv` ile fiziksel taşıma |
| Dosya sil | Çöp kutusuna gider | `.trash/` altına taşınır |
| Dosya iki klasörde gerekli | **Fiziksel kopya** oluşturulur | İki ayrı dosya olur |

Bir dosya iki klasörde olacaksa fiziksel olarak kopyalanır. Bu kullanıcının kafasını karıştırmaz: "C'deydi D'ye taşıdım, gitti mi?" endişesi olmaz. Gördüğün şey gerçek olandır.

---

## 4. VOLUME SİSTEMİ

### 4.1 Volume Nedir?

Volume, YAD'ın temel depolama birimidir. Bir klasör veya diskin tamamı volume olabilir:

| Senaryo | Volume Konumu |
|---------|--------------|
| Normal kullanım | `C:\Users\Ali\YAD\kisisel\` |
| İkinci disk | `D:\Arsiv\` |
| USB flash | `E:\` (tüm flash) |
| 8TB harici disk | `F:\` (tüm disk = workspace ana konumu) |
| Google Drive | Drive klasörü (cloud volume) |

### 4.2 Workspace ↔ Volume İlişkisi

Bir workspace bir veya birden fazla volume'dan oluşur:

```
Workspace: "Gazete X Arşivi"
│
├── Volume 1 (Ana): F:\  (8TB harici disk — workspace ana konumu)
│   ├── .yad/
│   │   ├── workspace.db     ← Ana workspace veritabanı
│   │   ├── volume.db        ← Bu volume'un metadata'sı
│   │   └── volume-id.json
│   ├── Haberler/
│   ├── Röportajlar/
│   └── Fotoğraflar/
│
├── Volume 2: C:\Users\Ali\YAD\gazete-ek\
│   ├── .yad/
│   │   ├── volume.db        ← Bu volume'un metadata'sı
│   │   └── volume-id.json
│   └── Yeni-Gelen/
│
└── Volume 3 (Flash): G:\
    ├── .yad/
    │   ├── volume.db
    │   └── volume-id.json
    └── Saha-Fotograflari/
```

**Kritik:** Workspace **ana konumu** harici disk olabilir. 8TB disk takıldığında workspace otomatik tespit edilir. Çıkarıldığında workspace "çevrimdışı" görünür.

### 4.3 Volume Dosya Yapısı

Her volume'un kökünde `.yad/` klasörü bulunur:

```
.yad/
├── volume-id.json          ← Volume kimliği
├── volume.db               ← SQLite: bu volume'daki dosyaların metadata'sı
│                              (etiketler, notlar, kişi eşleştirmeleri, rating)
├── persons.db              ← Kişi kartları (bu volume kapsamında)
├── thumbnails/             ← Thumbnail cache
│   ├── {file-hash}.webp
│   └── ...
├── auth-cache.json         ← Çevrimdışı kimlik doğrulama token'ı (şifreli)
└── access-log.json         ← Son erişim kayıtları
```

**`volume-id.json`:**
```json
{
  "volumeId": "vol-a1b2c3d4",
  "workspaceId": "ws-x9y8z7",
  "workspaceName": "Gazete X Arşivi",
  "isWorkspaceRoot": false,
  "ownerUserId": "usr-m5n6o7",
  "volumeName": "Saha Flash Diski",
  "createdAt": "2026-02-28T14:30:00Z",
  "diskUUID": "1234-ABCD",
  "diskLabel": "SAHA_USB",
  "registeredComputerIds": ["comp-abc123"],
  "allowedUserIds": ["usr-m5n6o7", "usr-p8q9r0"]
}
```

### 4.4 Kademeli Disk Tanıma (Cascade)

Disk takıldığında kademeli doğrulama çalışır. Her adım bir öncekinden pahalı; başarılı adımda durulur:

```
DİSK TAKILDI (OS event)
        │
        ▼
[ADIM 1] .yad/ klasörü var mı?
        │ Yok → Bu disk YAD ile ilgili değil → ATLA
        │ Var ↓
        ▼
[ADIM 2] volume-id.json oku → Volume UUID biliniyor mu?
        │ Bilinmiyor → "Tanınmayan YAD volume'u. İçe aktarılsın mı?"
        │ Biliniyor ↓
        ▼
[ADIM 3] Disk UUID doğrula (OS seviyesi)
        │ Eşleşmiyor → "Disk farklı görünüyor. Yine de bağlansın mı?"
        │ Eşleşiyor ↓
        ▼
[ADIM 4] (arkaplan) Dosya bütünlük kontrolü
        │ file-index taraması → eksik/değişmiş dosyalara sarı uyarı
        ▼
    VOLUME BAĞLANDI ✅
```

### 4.5 Workspace Ana Konumu Harici Diskte

Kullanıcı 8TB diski workspace ana konumu yapabilir:

```
F:\ (8TB Harici Disk)
├── .yad/
│   ├── workspace.db        ← ANA workspace DB (tüm volume'ları bilir)
│   ├── volume.db           ← Bu volume'un metadata'sı
│   ├── volume-id.json      ← isWorkspaceRoot: true
│   └── ...
├── 2024-Arsiv/
├── 2025-Arsiv/
└── Fotograflar/
```

- Disk takıldığında: workspace otomatik açılır
- Disk çıkarıldığında: workspace "çevrimdışı" — diğer volume'lar hâlâ erişilebilir ama ana DB yok
- Bu sebeple her volume kendi `volume.db`'sini taşır → ana disk olmadan da kendi metadata'sı okunabilir

---

## 5. TAŞINABİLİRLİK & ERİŞİM KURALLARI

### 5.1 Senaryo Haritası

Bu tablo YAD'ın en kritik davranış kurallarını tanımlar:

| Senaryo | Kim | Nerede | Sonuç |
|---------|-----|--------|-------|
| Ali flash'ı kendi bilgisayarına takar | Volume sahibi | Kayıtlı bilgisayar | **Tam erişim** (RBAC: Owner) |
| Ali flash'ı başka bilgisayara takar, kendi hesabıyla girer | Volume sahibi | Kayıtsız bilgisayar | **Read-only** |
| Mehmet (tanımadık) flash'ı takar | Yetkisiz | Herhangi bir yer | **Erişim yok** (YAD tanımaz) |
| Ayşe (Editor) flash'ı kendi kayıtlı bilgisayarına takar | Workspace üyesi | Kendi kayıtlı bilgisayarı | **RBAC'a göre** (Editor = etiket düzenleyebilir) |
| Ayşe flash'ı rastgele bilgisayara takar | Workspace üyesi | Kayıtsız bilgisayar | **Read-only** |
| 8TB disk takılıyor (workspace root) | Owner | Kayıtlı bilgisayar | **Workspace açılır**, tam erişim |
| 8TB disk çıkarılıyor | — | — | **Workspace çevrimdışı** |

### 5.2 Erişim Kuralları (Karar Ağacı)

```
Volume takıldı
    │
    ├── Bu bilgisayar volume'un kayıtlı bilgisayarı mı?
    │   │
    │   ├── EVET → Giriş yapan kullanıcı allowedUserIds'de mi?
    │   │   │
    │   │   ├── EVET → RBAC rolüne göre erişim (tam yetki)
    │   │   └── HAYIR → Erişim yok
    │   │
    │   └── HAYIR (başka bilgisayar) → Giriş yapan kullanıcı allowedUserIds'de mi?
    │       │
    │       ├── EVET → READ-ONLY erişim (görüntüleme + metadata okuma)
    │       └── HAYIR → Erişim yok (YAD bu volume'u tanımaz/göstermez)
    │
    └── (Çevrimdışı doğrulama: auth-cache.json kullanılır)
```

### 5.3 Çevrimdışı Kimlik Doğrulama

İnternet olmadan da volume erişimi mümkün olmalıdır:

**Mekanizma:**
1. Kullanıcı YAD'a internet varken giriş yaptığında, her volume'un `.yad/auth-cache.json` dosyasına şifreli bir token yazılır
2. Token içeriği: kullanıcı ID, rol, son doğrulama tarihi, imza (HMAC)
3. İnternet yoksa bu cache'den doğrulama yapılır
4. Token süresi: 30 gün (ayarlanabilir). Süresi dolmuşsa internet gerekir.

**`auth-cache.json` (şifreli):**
```json
{
  "tokens": [
    {
      "userId": "usr-m5n6o7",
      "username": "ali.yilmaz",
      "role": "owner",
      "computerId": "comp-abc123",
      "lastVerified": "2026-02-28T10:00:00Z",
      "expiresAt": "2026-03-30T10:00:00Z",
      "hmac": "a1b2c3d4..."
    },
    {
      "userId": "usr-p8q9r0",
      "username": "ayse.demir",
      "role": "editor",
      "computerId": "comp-def456",
      "lastVerified": "2026-02-27T15:00:00Z",
      "expiresAt": "2026-03-29T15:00:00Z",
      "hmac": "e5f6g7h8..."
    }
  ]
}
```

### 5.4 Volume Düzenleme Kuralları

| Veri Türü | Ana bilgisayarda | Başka bilgisayarda (kendi hesap) |
|-----------|:----------------:|:-------------------------------:|
| Dosya görüntüleme | ✅ | ✅ |
| Metadata okuma (etiket, not, kişi) | ✅ | ✅ |
| Etiket düzenleme | ✅ (RBAC'a göre) | ❌ Read-only |
| Not düzenleme | ✅ (RBAC'a göre) | ❌ Read-only |
| Dosya ekleme/silme | ✅ (RBAC'a göre) | ❌ Read-only |
| Klasör oluşturma/taşıma | ✅ (RBAC'a göre) | ❌ Read-only |

**Neden?** Başka bilgisayarda düzenlemeye izin verilirse, eve dönüp ana workspace'e sync ederken çatışma riski çok yükselir. Read-only kuralı basitlik ve güvenlik sağlar.

---

## 6. İÇERİK TOPLAMA & ORGANİZASYON

### 6.1 İçerik Toplama

| Özellik | Açıklama | Öncelik |
|---------|----------|:------:|
| Drag & Drop | Dosya yöneticisinden sürükle-bırak | P0 |
| Clipboard | Kopyala-yapıştır ile görsel/metin ekleme | P0 |
| Auto-import | Belirlenen klasörleri izleyerek otomatik import | P1 |
| Video Bookmark | YouTube/Vimeo linklerini önizlemeli kaydetme | P1 |
| Kaynak URL | Her dosyanın orijinal kaynak URL'si otomatik kaydedilir | P0 |

**Dosya ekleme davranışı (Hibrit):**
- **Varsayılan:** Dosya volume klasörüne **fiziksel olarak kopyalanır**
- **Opsiyonel:** "Sadece bağlantı olarak ekle" (referans modu)
- Referans modunda dosya erişilemezse sarı uyarı gösterilir
- Harici diskten eklenen dosyalar için: *"Güvenlik için workspace'e kopyalamak ister misiniz?"*

### 6.2 Organizasyon

| Özellik | Açıklama | Öncelik |
|---------|----------|:------:|
| Hiyerarşik Klasörler | Renk/ikon özelleştirmeli, fiziksel karşılıklı | P0 |
| Gelişmiş Etiketleme | Kişi/zaman/olay/yer/serbest etiketler (bkz. 6.3) | P0 |
| Auto Tag | Klasöre etiket → alt öğelere opsiyonel uygulama | P1 |
| Rating | 1-5 yıldız derecelendirme | P1 |
| Batch Processing | Toplu seçim, etiketleme, yeniden adlandırma | P0 |
| Password Protection | Klasörleri parola ile koruma | P1 |
| Notes | ProseMirror tabanlı zengin metin notları | P0 |
| URL | Her dosyaya kaynak URL bağlantısı | P0 |
| Harici Editör | Sistem varsayılan uygulamasında açma butonu | P1 |

**Cross-reference YOKTUR.** Bir dosyanın iki klasörde olması gerekiyorsa fiziksel kopya oluşturulur.

**Dosya Kilitleme:** Biri not/etiket düzenlerken dosya kilitlenir, diğerleri read-only. 5 dk inaktivitede kilit otomatik kalkar.

### 6.3 Etiketleme Sistemi

**Etiket Türleri:**

| Tür | Açıklama | Örnek |
|-----|----------|-------|
| **Kişi** | Kişi kartından eşleştir | "Ahmet Yılmaz", "Bakan X" |
| **Zaman** | Tarih/dönem | "2024-03-15", "2024 Seçimleri" |
| **Olay** | Haber olayı | "Deprem", "Ekonomi Krizi" |
| **Yer** | Konum | "Ankara", "TBMM" |
| **Serbest** | İstediğin herhangi bir şey | "Acil", "Yayınlandı" |

**Kişi Kartı Sistemi:**
- Ayrı kişi veritabanı (volume.db içinde `persons` tablosu)
- Kişi kartı: ad, soyad, unvan, kurum, iletişim, fotoğraf, notlar
- Kişiler ↔ dosyalar: N:N ilişki (bir dosyada çok kişi, bir kişi çok dosyada)
- Kişi sayfasından tüm dosyalarını, dosya sayfasından tüm kişilerini görüntüleme

**Etiket davranışı:**
- Klasöre etiket atandığında: **"Alt öğelere de uygulansın mı?"** checkbox (varsayılan: hayır)
- Çapraz filtreleme: "Ahmet Yılmaz" + "2024" + "Deprem" → kesişim

### 6.4 Arama

| Özellik | Açıklama | Öncelik |
|---------|----------|:------:|
| Keyword Search | Full-text arama (SQLite FTS5, <0.5 sn) | P0 |
| Color Search | Renk paletine göre görsel arama | P2 |
| Filter | Format, boyut, kişi, olay, zaman, yer, tag, rating | P0 |
| Reverse Image Search | Görselin kaynağını bulma (harici API) | P2 |
| Quick Search | Cmd/Ctrl+K ile anında arama | P0 |
| Random Mode | Rastgele karıştırma | P2 |

### 6.5 Önizleme

| Format Grubu | Formatlar | Mod |
|-------------|-----------|-----|
| Görsel | JPG, PNG, GIF, WebP, SVG, BMP, TIFF, HEIC | Dahili viewer |
| Video | MP4, MOV, AVI, MKV, WebM | Dahili player |
| Ses | MP3, WAV, AAC, FLAC, M4A | Player + waveform |
| Doküman | PDF, DOCX, TXT, MD, HTML | Salt okunur reader |
| Diğer | Tüm dosya türleri | Jenerik ikon + metadata |

**Düzenleme politikası:** YAD arşiv uygulamasıdır. İçerik düzenlenmez, görüntülenir. Düzenleme için "Harici uygulamada aç" butonu.

---

## 7. WORKSPACE & KULLANICI SİSTEMİ

### 7.1 Workspace Yapısı

```
Kullanıcı (Supabase hesabı)
├── Kişisel Workspace
│   ├── Volume: C:\Users\Ali\YAD\kisisel\
│   ├── Volume: D:\Arsiv\
│   └── Volume: Google Drive
├── "Gazete X Arşivi" (paylaşımlı)
│   ├── Volume (Ana): F:\ (8TB disk, workspace root)
│   ├── Volume: G:\ (saha flash'ı)
│   └── Üyeler: Ali (Owner), Ayşe (Editor), Mehmet (Viewer)
└── "Dergi Y" (paylaşımlı)
    └── ...
```

### 7.2 Kullanıcı Hesabı

- **Supabase Auth** ile giriş (e-posta/parola, ileride OAuth)
- Profil: ad, soyad, kurum, profil fotoğrafı
- Kullanıcılar birbirini **kullanıcı adıyla** bulup workspace'e davet
- Çevrimdışı: auth-cache.json ile son giriş hatırlanır (30 gün)

### 7.3 RBAC

| Rol | Görüntüle | Dosya Ekle | Etiket/Not Düzenle | Dosya Sil/Taşı | WS Yönetimi |
|-----|:---------:|:----------:|:------------------:|:--------------:|:-----------:|
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Contributor** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Editor** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Manager** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ |

**Contributor:** Dosya ekleyemez ama mevcut dosyaların etiketlerini ve notlarını düzenleyebilir. Arşivcilerin kataloglama yapması için ideal.

**RBAC sadece kayıtlı bilgisayarda geçerlidir.** Başka bilgisayarda volume her zaman read-only.

---

## 8. P2P SENKRONİZASYON

### 8.1 Genel Akış

```
┌────────────┐     Supabase Realtime      ┌────────────┐
│  Peer A    │◄──── (signaling) ────►│  Peer B    │
│  (Tauri)   │◄════ WebRTC P2P ════►│  (Tauri)   │
└────────────┘     (dosya transfer)       └────────────┘
       ▲                                        ▲
       │               SUPABASE                 │
       └───── Auth + RBAC + Realtime ──────────┘
```

### 8.2 Bağlantı

1. Aynı workspace üyeleri Supabase Realtime'a bağlanır
2. Presence ile çevrimiçi üyeler görünür
3. SDP offer/answer Supabase Realtime üzerinden exchange
4. STUN: `stun.l.google.com:19302`, `stun1.l.google.com:19302`, `stun.services.mozilla.com`
5. P2P kurulursa → WebRTC DataChannel ile sync
6. Kurulamazsa → Hata: *"Doğrudan bağlantı kurulamadı. Katı firewall tespit edildi."*

### 8.3 Sync Senaryoları

| Rol | Sync davranışı |
|-----|---------------|
| **Editor/Manager/Owner** | Dosyaların tam kopyası + metadata senkronize |
| **Viewer/Contributor** | Yalnızca thumbnail + metadata. Orijinal dosya talep üzerine stream |

### 8.4 Çatışma Çözümü

| İşlem | Çözüm |
|-------|-------|
| Dosya ekleme | Benzersiz UUID, çatışma yok |
| Etiket ekleme | Additive: iki farklı etiket → ikisi de kalır |
| Etiket silme | Last-write-wins + audit log |
| Not düzenleme | Dosya kilitleme |
| Dosya silme | Soft-delete + diğer peer'larda onay gerekli |
| Klasör yapısı | Timestamp bazlı last-write-wins |

**Silme güvenliği:** Bir peer'da silinen dosya diğerlerinde otomatik silinmez. Bildirim: *"[Kullanıcı] bu dosyayı sildi. Siz de silmek istiyor musunuz?"* Çöp kutusunda 30 gün kalır.

---

## 9. METADATA SYNC STRATEJİSİ

### 9.1 Metadata Nerede Yaşar?

```
Volume A (ana bilgisayar)          Volume B (flash disk)
┌──────────────┐                  ┌──────────────┐
│ .yad/        │                  │ .yad/        │
│  volume.db ◄─┼──── sync ──────►│  volume.db   │
│  persons.db◄─┼──── sync ──────►│  persons.db  │
│  auth-cache  │                  │  auth-cache  │
│              │                  │              │
│ dosyalar...  │                  │ dosyalar...  │
└──────────────┘                  └──────────────┘
```

- **Her volume kendi metadata'sını taşır** (volume.db)
- Volume'lar arası metadata sync: workspace üyeleri çevrimiçi olduğunda P2P ile
- Bir volume başka bilgisayara götürüldüğünde: kendi metadata'sı zaten yanında
- Ana workspace.db (workspace root volume'da): tüm volume'ların listesi ve global kişi kartları

### 9.2 Sync Akışı

```
1. Ali bilgisayarında "deprem.jpg" dosyasına "Acil" etiketi ekler
2. volume.db güncellenir (Volume A)
3. Ayşe çevrimiçiyse → P2P ile Ayşe'nin volume.db'sine push
4. Ayşe çevrimiçi değilse → Ayşe bağlandığında delta sync
5. Flash disk bağlıysa → flash'ın volume.db'si de güncellenir
```

### 9.3 Volume'lar Arası Dosya Taşıma

```
Kullanıcı Volume A'dan Volume B'ye dosya taşıyor:
1. Fiziksel dosya Volume B'ye kopyalanır
2. Volume B'nin volume.db'sine metadata yazılır
3. Volume A'dan fiziksel dosya silinir
4. Volume A'nın volume.db'sinden kayıt kaldırılır
5. Atomik işlem: bir adım başarısızsa tamamı geri alınır
```

---

## 10. GOOGLE DRIVE ENTEGRASYONU

| Özellik | Açıklama |
|---------|----------|
| Tek yönlü yedekleme | Workspace → Drive (otomatik/manuel) |
| Çift yönlü sync | Workspace ↔ Drive (opsiyonel) |
| Şifreli yedekleme | AES-256 ile şifrelenmiş |
| Seçici sync | Belirli klasörleri/etiketleri dahil/hariç |
| Volume olarak Drive | Google Drive bir volume olarak bağlanabilir |
| Firewall alternatifi | P2P kurulamadığında Drive üzerinden dolaylı sync |
| Workspace bazında | Her workspace ayrı Drive klasörüne |

---

## 11. PORTABLE EXPORT (.yad)

```
arsiv-export-2026-02-28.yad (ZIP tabanlı)
├── manifest.json           ← YAD versiyonu, oluşturan, tarih
├── metadata/
│   ├── files.json          ← Dosya metadata (etiketler, notlar, rating)
│   ├── tags.json           ← Etiket tanımları
│   ├── persons.json        ← Kişi kartları
│   └── relations.json      ← Dosya ↔ kişi eşleştirmeleri
└── files/
    ├── {uuid1}/
    │   ├── original.jpg
    │   └── thumbnail.webp
    └── ...
```

- Başka bilgisayarda YAD ile açılabilir
- Flash, harddisk, e-posta ile taşınabilir
- Kısmi export: seçili dosyalar, klasör veya tüm workspace

---

## 12. DOSYA GÜVENLİĞİ

| Senaryo | Koruma |
|---------|--------|
| Uygulama çökmesi | Dosyalar düz klasör yapısında, uygulama olmadan erişilebilir |
| Bilgisayar bozulması | Drive yedekleme + peer kopyaları |
| Disk bozulması | Diğer volume'lar + peer'lar |
| Workspace'den atılma | Lokal dosyalar silinmez, sync durur |
| Peer'da dosya silinmesi | Diğerlerde onay olmadan silinmez |
| Uygulama kaldırılması | Dosyalar + JSON metadata kalır |
| İnternet kesilmesi | Çevrimdışı token ile çalışmaya devam |

**Açık format prensibi:** Klasörler düz dosya sistemi, metadata SQLite + JSON, uygulama olmadan okunabilir.

---

## 13. SUPABASE ŞEMASI

```sql
-- Kullanıcılar
CREATE TABLE profiles (
    id UUID REFERENCES auth.users PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    organization TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace'ler
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Üyelikler & RBAC
CREATE TABLE workspace_members (
    workspace_id UUID REFERENCES workspaces(id),
    user_id UUID REFERENCES profiles(id),
    role TEXT CHECK (role IN ('viewer','contributor','editor','manager','owner')),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

-- Davetler
CREATE TABLE workspace_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),
    invited_by UUID REFERENCES profiles(id),
    invited_username TEXT NOT NULL,
    role TEXT CHECK (role IN ('viewer','contributor','editor','manager')),
    status TEXT CHECK (status IN ('pending','accepted','rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bilinen bilgisayarlar (kayıtlı cihazlar)
CREATE TABLE registered_computers (
    id TEXT PRIMARY KEY,                    -- comp-{uuid}, cihazda üretilir
    user_id UUID REFERENCES profiles(id),
    computer_name TEXT,
    os TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Signaling (WebRTC, ephemeral)
CREATE TABLE signaling (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),
    from_user UUID REFERENCES profiles(id),
    to_user UUID REFERENCES profiles(id),
    type TEXT CHECK (type IN ('offer','answer','ice-candidate')),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes'
);
```

**Dosya metadata'sı Supabase'de tutulmaz.** Tamamen lokal volume.db'lerde yaşar.

---

## 14. UI/UX

### 14.1 Ana Ekran

```
┌──────────────┬──────────────────────────┬──────────────┐
│ SOL PANEL    │ ORTA ALAN                │ SAĞ PANEL    │
│              │                          │              │
│ 🔍 Arama     │ Dosya Grid/Liste          │ 📷 Önizleme   │
│ 📂 Workspace │ (Justified/Grid/List)    │ 🏷️ Etiketler  │
│   seçici     │                          │ 👤 Kişiler    │
│ 📁 Klasörler  │                          │ 📝 Not (Prose) │
│ 🏷️ Etiketler  │                          │ 🔗 URL        │
│ 👤 Kişiler   │                          │ ⭐ Rating     │
│ 📀 Volume'lar │                          │ 📀 Volume     │
│   🟢 Ana Disk │                          │ 📊 Metadata   │
│   🟢 D:\     │                          │ [Harici aç]  │
│   🔴 USB     │                          │              │
│   🟡 Drive   │                          │              │
└──────────────┴──────────────────────────┴──────────────┘
┌─────────────────────────────────────────────────────────┐
│ 📀 3 volume (2 bağlı) │ 🟢 2 peer çevrimiçi │ 🔄 Güncel │
└─────────────────────────────────────────────────────────┘
```

### 14.2 Kişi Kartı

```
┌────────────────────────────────────┐
│ 📷 [Fotoğraf]                      │
│ Ahmet Yılmaz                       │
│ Genel Yayın Yönetmeni — Gazete X   │
│ ──────────────────────             │
│ 📧 ahmet@gazetex.com               │
│ 📱 +90 555 ...                     │
│ ──────────────────────             │
│ İlişkili dosyalar: 47              │
│ Son eklenen: 2 gün önce            │
│ 📝 Notlar: ...                     │
└────────────────────────────────────┘
```

---

## 15. PLUGIN & MCP

- **Plugin API:** JavaScript/TypeScript, Tauri IPC üzerinden
- **MCP Server:** YAD lokal API endpoint olarak çalışır, AI araçları erişebilir
- **Örnek pluginler:** OCR, AI etiketleme, özel export

---

## 16. AÇIK TARTIŞMA

### 🟡 Ücretlendirme Modeli

Henüz karar verilmedi. İleride değerlendirilecek.

---

## 17. MVP YARI HARİTASI

| Faz | Kapsam | Süre |
|-----|--------|:----:|
| **Faz 1** | Lokal arşiv: volume sistemi, fiziksel klasörler, etiketleme, kişi kartları, ProseMirror notlar, arama, önizleme | 10-12 hafta |
| **Faz 2** | Supabase Auth, workspace, RBAC, davet, kayıtlı bilgisayar sistemi | 4-6 hafta |
| **Faz 3** | WebRTC P2P sync, signaling, conflict çözümü, viewer modu | 6-8 hafta |
| **Faz 4** | Google Drive, `.yad` export/import, çevrimdışı auth | 4-6 hafta |
| **Faz 5** | Plugin sistemi, MCP server | 4-6 hafta |

**Tahmini toplam: ~7-9 ay (tek geliştirici)**

---

## 18. SONRAKI ADIMLAR

1. ✅ Ürün gereksinimleri tanımlandı (v0.3)
2. ✅ Mimari kararlar alındı
3. ⬜ Wireframe/mockup tasarımı
4. ⬜ Supabase proje kurulumu
5. ⬜ Tauri proje iskeleti
6. ⬜ Faz 1 geliştirme başlangıcı

---

*YAD PRD v0.3 — Her değişiklik versiyon numarasıyla takip edilir.*
