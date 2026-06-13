# YAD — Ekran & Wireframe Dokümanı (v1)

**Versiyon:** 1.0 · **Tarih:** 13 Haziran 2026
**Kapsam:** YAD v1 (PRD v0.4) tüm ekranları — ASCII wireframe + UX açıklamaları
**Tema:** shadcn/ui + tweakcn **solar-dusk** (sıcak/toprak, `globals.css`)
**Bağlam:** Tauri v2 masaüstü · 3-panel · local-first + P2P (Iroh) · gazeteci kitlesi

> Bu doküman görsel/etkileşim sözleşmesidir. Kodlama sırasında her bileşen **shadcn MCP iş akışıyla** eklenir (bkz. `ui-rules.md`). ASCII oranları yaklaşıktır; gerçek ölçüler uygulamada token'larla verilir.

---

## BÖLÜM 0 — TEMELLER (Tüm ekranlarda geçerli)

### 0.1 Tasarım token'ları (globals.css'ten)

| Token | Açık mod | Kullanım |
|-------|----------|----------|
| `background` | sıcak krem | Sayfa zemini |
| `foreground` | koyu kahve | Varsayılan metin |
| `card` / `popover` | kırık beyaz | Yüzeyler, panel kartları |
| `primary` | golden-brown | Ana eylem, seçili durum, CTA |
| `secondary` | açık tan | İkincil eylem |
| `muted` / `muted-foreground` | açık gri / yumuşak | Pasif metin, ayraç, placeholder |
| `accent` | soluk sarı (koyu: muted blue) | Hover, vurgular |
| `destructive` | kırmızı-kahve | Sil/tehlike |
| `border` / `input` / `ring` | nötr / golden ring | Kenarlık, odak halkası |
| `sidebar*` | sıcak gri grubu | Sol panel özel token'ları |

Radius **0.3rem** (hafif yuvarlak, keskin değil). Gölge yumuşak (2px offset, 3px blur). **Renkler yalnızca token üzerinden** — hardcode yasak.

### 0.2 Tipografi sistemi (3 font, ekstra font YOK)

- **Oxanium** (`font-sans`) — UI, başlık, marka, **sayısal göstergeler** (dosya sayısı, boyut, tarih, rating). Varsayılan.
- **Merriweather** (`font-serif`) — **uzun okuma metni**: notlar (ProseMirror gövdesi), kişi biyografisi, makale benzeri içerik. Gazetecilik imzası burada.
- **Fira Code** (`font-mono`) — hash, NodeId, teknik değerler.

Hiyerarşi örneği: Sayfa başlığı `text-xl font-semibold`, bölüm başlığı `text-sm font-medium uppercase tracking-wide text-muted-foreground`, gövde `text-sm`, meta `text-xs text-muted-foreground`.

### 0.3 Uygulama kabuğu (shell) — her zaman ekranda

```
┌─────────────────────────────────────────────────────────────────────┐
│ ☰  YAD   Gazete X Arşivi ▾        ⌕ Ara (Ctrl+K)      ◑  ⟳  ⚙  ●AY   │  ← üst bar (titlebar)
├──────────┬──────────────────────────────────────────┬───────────────┤
│          │                                          │               │
│  SOL     │            ORTA ALAN                      │   SAĞ         │
│  PANEL   │            (içerik)                       │   INSPECTOR   │
│ (Sidebar)│      (ResizablePanelGroup içinde)         │               │
│          │                                          │               │
├──────────┴──────────────────────────────────────────┴───────────────┤
│ 📀 2/3 volume · 🟢 1 peer · ⟳ Güncel · v1.0.0          🔔 ●          │  ← alt durum çubuğu
└─────────────────────────────────────────────────────────────────────┘
```

- **Üst bar:** `☰` panel daralt · workspace seçici (▾) · global arama tetikleyici · `◑` tema · `⟳` senkron · `⚙` ayarlar · `●AY` profil avatarı.
- **Sol panel:** shadcn **`Sidebar`**. Daraltılabilir.
- **Orta + Sağ:** shadcn **`ResizablePanelGroup`** + `ResizableHandle`. Kullanıcı genişlik ayarlar; sağ panel kapanabilir (uzman tam-genişlik grid ister).
- **Alt durum çubuğu:** volume durumu · peer · senkron · sürüm · bildirim zili. Tıklanabilir (her biri ilgili panele götürür).

### 0.4 Renk semantiği (durum dili — jargon yerine renk+ikon)

| Durum | Renk | İkon | Anlam |
|-------|------|------|-------|
| Senkron/güncel | yeşil nokta | ✓ | Her şey eşitlendi |
| Senkronlanıyor | golden (primary) | ⟳ dönen | Aktif transfer |
| Çevrimdışı volume | gri | ○ | Disk takılı değil, içerik görünür ama soluk |
| Çatışma | destructive | ⚠ | Kullanıcı kararı gerekli |
| Çevrimiçi peer | yeşil | ● | Kişi şu an bağlı |

### 0.5 Klavye hızlandırıcıları (gizli ama güçlü — NN/g deseni)

Acemi hiç fark etmez; `?` ile referans açılır. Sık eylemler her zaman görünür butonda da var.

| Tuş | Eylem | Tuş | Eylem |
|-----|-------|-----|-------|
| `Ctrl+K` | Komut paleti / ara | `G` | Grid görünümü |
| `Space` | Hızlı önizleme | `L` | Liste görünümü |
| `E` | Loupe (büyük önizleme) | `C` | Karşılaştır (çoklu) |
| `T` | Etiket ekle | `N` | Not düzenle |
| `1–5` | Rating ver | `Del` | Çöpe taşı |
| `Ctrl+A` | Tümünü seç | `Esc` | Seçimi/paneli kapat |
| `+ / −` | Grid yoğunluğu | `?` | Kısayol referansı |

### 0.6 "AI-vibe'sız / tasarımcı işi" disiplini (her ekranda uygulanır)

1. **Tek aksan rengi** (golden-brown). Renk anlam taşır, dekor değil.
2. **Gerçek tipografik kademe** — boyut+ağırlık+renk. "Her şey 14px orta-gri" yasak.
3. **Yoğun ama nefes alan** — DAM yoğundur; dev boşluk/dev yuvarlak kart yok. Linear/Lightroom dengesi.
4. **Tutarlı ikonografi** — Lucide, tek stroke. Emoji-ikon yok (bu dokümandaki emojiler sadece şematik).
5. **İnce mikro-etkileşim** — 120–200ms, amaçlı (hover, seçim, panel geçişi). Bounce/parlama yok.
6. **Kaçınılacaklar:** ortalanmış her şey, gradyan, dev hero, kart-içinde-kart, abartılı gölge, gereksiz boş alan.

### 0.7 Durum konvansiyonları (her liste/panel için)

- **Boş durum:** kişilikli + tek net eylem (örn. "Henüz dosya yok — ilkini sürükle ya da Ekle'ye bas").
- **Yükleniyor:** skeleton (gerçek düzenin gri iskeleti), spinner değil.
- **Hata/çevrimdışı:** sebep + kurtarma eylemi ("Tekrar dene").
- **Optimistic geri-alma:** işlem başarısızsa **görünür toast** ("Etiket eklenemedi, geri alındı").

---

## BÖLÜM 1 — GİRİŞ & İLK AÇILIŞ

### Ekran 1 — Splash / Yükleme

**Amaç:** Açılışta volume'lar taranırken kısa, sakin karşılama.

```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│                  ◆ YAD                       │   ← marka (Oxanium)
│            Dijital Arşiv                     │
│                                             │
│         ▰▰▰▰▰▰▱▱▱▱  Volume'lar taranıyor…   │   ← ince ilerleme
│                                             │
└─────────────────────────────────────────────┘
```

- Maksimum sadelik. 1–2 sn'den uzun sürerse ne yapıldığını yazar ("Volume'lar taranıyor", "Metadata yükleniyor").
- shadcn: `Progress` (ince). Logo dışında dekor yok.

---

### Ekran 2 — Onboarding (ilk açılış sihirbazı, ilk kez)

**Amaç:** Korkutmadan kimlik + ilk kütüphane kurmak. Atlanabilir, 3 adım. Progressive disclosure: anahtar/relay gibi teknik detay görünmez.

**Adım 1/3 — Hoş geldin & kimlik**
```
┌──────────────────────────────────────────────────────────┐
│  ◆ YAD'a hoş geldin                              1 / 3    │
│  ────────────────────────────────────────────────────   │
│  Arşivin sana ait. Hiçbir şey buluta gitmez.             │   ← güven mesajı (Merriweather)
│                                                          │
│  Görünen adın                                            │
│  ┌────────────────────────────────────────────┐         │
│  │ Ali Yılmaz                                 │         │
│  └────────────────────────────────────────────┘         │
│  Avatar (opsiyonel)   ( AY )  [ Görsel seç ]            │
│                                                          │
│  ⓘ Kimliğin bu cihazda güvenli bir anahtarla oluşturulur.│   ← teknik detay tek satır, sakin
│                                                          │
│                                  [ Atla ]   [ Devam → ]  │
└──────────────────────────────────────────────────────────┘
```

**Adım 2/3 — İlk kütüphane**
```
┌──────────────────────────────────────────────────────────┐
│  Arşivini nerede saklayalım?                      2 / 3   │
│  ────────────────────────────────────────────────────   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │ 💻 Bu        │ │ 💽 Harici    │ │ 🔌 USB       │     │
│  │   bilgisayar │ │   disk       │ │   bellek     │     │
│  │ (önerilen)   │ │              │ │              │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
│  Konum: C:\Users\Ali\YAD\        [ Değiştir ]           │
│  Kütüphane adı: ┌──────────────────────────┐            │
│                 │ Kişisel Arşiv            │            │
│                 └──────────────────────────┘            │
│                                  [ ← Geri ]  [ Devam → ] │
└──────────────────────────────────────────────────────────┘
```

**Adım 3/3 — İlk içerik (opsiyonel)**
```
┌──────────────────────────────────────────────────────────┐
│  Hazırsın! İstersen ilk dosyalarını ekle.        3 / 3   │
│  ────────────────────────────────────────────────────   │
│        ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐             │
│        │      ⬇  Dosyaları buraya sürükle   │             │   ← drop zone (dashed)
│        │         ya da  [ Gözat ]           │             │
│        └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘             │
│                                                          │
│                              [ Sonra eklerim → Bitir ]   │
└──────────────────────────────────────────────────────────┘
```

- shadcn: `Dialog` (veya tam ekran), `Input`, `Button`, `RadioGroup` (konum kartları), `Progress` (adım göstergesi).
- Her adım atlanabilir; "Atla/Sonra" eşit görünür. Asla zorlama yok.

---

### Ekran 3 — Profil / Kimlik (ayarlar içinden de erişilir)

**Amaç:** Ad, avatar düzenleme; kimlik anahtarı "ileri" katmanda.

```
┌──────────────────────────────────────────────┐
│  Profil                                       │
│  ──────────────────────────────────────────  │
│   ( AY )  [ Görseli değiştir ]                │
│                                               │
│   Görünen ad   ┌────────────────────────┐     │
│                │ Ali Yılmaz             │     │
│                └────────────────────────┘     │
│   Kurum (ops.) ┌────────────────────────┐     │
│                │ Gazete X               │     │
│                └────────────────────────┘     │
│  ───────────────────────────────────────────  │
│  ▸ Gelişmiş: Kimlik anahtarı (NodeId)         │   ← Accordion, kapalı gelir
│                                               │
│                              [ Kaydet ]        │
└──────────────────────────────────────────────┘
```

- "Gelişmiş" açılınca NodeId (Fira Code, kopyalanabilir) + "anahtarı yedekle" görünür. Acemi hiç açmaz.

---

## BÖLÜM 2 — ANA ÇALIŞMA EKRANI (3-PANEL)

### Ekran 4 — Ana ekran (Grid varsayılan)

**Amaç:** Uygulamanın kalbi. Sol nav + orta grid + sağ inspector.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ☰  YAD  Gazete X Arşivi ▾        ⌕ Ara (Ctrl+K)         ◑  ⟳  ⚙  ●AY      │
├───────────────────┬────────────────────────────────────┬──────────────────┤
│ KÜTÜPHANE         │  Tüm Dosyalar          1.248 öğe    │  ÖNİZLEME        │
│  ▸ 📚 Tüm Dosyalar│  [⊞ Grid][≣ Liste]  ⌖ Filtre  ⇅ Sırala│ ┌──────────────┐ │
│  ▸ 🕘 Son Eklenen │ ┌────┐┌────┐┌────┐┌────┐┌────┐      │ │              │ │
│                   │ │ 🖼 ││ 🖼 ││ 🎬 ││ 🖼 ││ 🔊 │      │ │   [seçili    │ │
│ KOLEKSİYONLAR  +  │ │•🏷 ││    ││•🏷📝││•🏷 ││    │      │ │    dosya     │ │
│  ▸ Deprem 2024    │ └────┘└────┘└────┘└────┘└────┘      │ │   önizleme]  │ │
│  ▸ Röportajlar    │ ┌────┐┌────┐┌────┐┌────┐┌────┐      │ └──────────────┘ │
│                   │ │ 🖼 ││ 🖼 ││ 🖼 ││ 📄 ││ 🖼 │      │ deprem-007.jpg   │
│ ETİKETLER      +  │ │    ││•📝 ││    ││•🏷 ││•🏷 │      │ 4.2 MB · JPG     │
│  ▸ # Ankara       │ └────┘└────┘└────┘└────┘└────┘      │ ──────────────── │
│  ▸ # TBMM         │ ┌────┐┌────┐┌────┐┌────┐┌────┐      │ 🏷 Etiketler  +  │
│  ▸ # Acil         │ │ 🖼 ││ 🎬 ││ 🖼 ││ 🖼 ││ 🖼 │      │  Ankara · Acil   │
│                   │ └────┘└────┘└────┘└────┘└────┘      │ 👤 Kişiler    +  │
│ KİŞİLER        +  │                                     │  Ahmet Yılmaz    │
│  ▸ Ahmet Yılmaz   │                                     │ 📝 Not           │
│  ▸ Bakan X        │                                     │  "Saha çekimi…"  │
│                   │                                     │ 🔗 Kaynak URL    │
│ VOLUME'LAR        │                                     │ ⭐ ★★★★☆         │
│  🟢 Ana Disk      │                                     │ ──────────────── │
│  🟢 D:\ Arşiv     │                                     │ 🕘 Geçmiş · 👤Atıf│
│  ○ USB (çevrimdışı)│                                    │ [ Harici aç ]    │
├───────────────────┴────────────────────────────────────┴──────────────────┤
│ 📀 2/3 volume · 🟢 1 peer · ⟳ Güncel · v1.0.0                    🔔        │
└────────────────────────────────────────────────────────────────────────────┘
```

**Sol panel (Sidebar):** Kütüphane kısayolları → Koleksiyonlar (sanal) → Etiketler (hiyerarşik ağaç) → Kişiler → Volume'lar (durum rozetli). Her grupta `+` ekleme. Bölüm başlıkları küçük, uppercase, muted.

**Orta (grid):**
- Hücrede **köşe rozetleri** (Lightroom deseni): `•` seçili, `🏷` etiketli, `📝` notlu, sağ-alt senkron/sürüm/kişi. Tarama için inspector açmaya gerek yok.
- Üstte görünüm anahtarı (Grid/Liste), Filtre, Sırala. Yoğunluk `+/−`.
- Çevrimdışı volume öğeleri **soluk + ○ rozet** ama görünür/gezilebilir (Spacedrive deseni).

**Sağ (inspector):** Önizleme → dosya künyesi → Etiketler → Kişiler → Not → URL → Rating → (alt) Geçmiş/Atıf sekmesi → "Harici aç". Hiçbir seçim yoksa boş durum.

---

### Ekran 5 — Orta alan görünümleri

**5a — Liste görünümü (`L`)** — detay sütunları, yoğun tarama.
```
│  Tüm Dosyalar          1.248 öğe    [⊞ Grid][≣ Liste]  ⌖ Filtre  ⇅      │
│  ┌──┬─────────────────────┬────────┬─────────┬────────┬──────┬───────┐ │
│  │  │ Ad                  │ Tür    │ Etiketler│ Kişi   │ ⭐   │ Tarih │ │
│  ├──┼─────────────────────┼────────┼─────────┼────────┼──────┼───────┤ │
│  │🖼│ deprem-007.jpg      │ JPG    │ Ankara… │ A.Yılmaz│★★★★☆│ 12 Haz│ │
│  │🎬│ roportaj-bakan.mp4  │ MP4    │ TBMM    │ Bakan X │★★★☆☆│ 11 Haz│ │
│  │🔊│ ses-kaydi-03.mp3    │ MP3    │ Acil    │ —       │★★☆☆☆│ 10 Haz│ │
│  └──┴─────────────────────┴────────┴─────────┴────────┴──────┴───────┘ │
```
- Sütun başlığına tıkla → sırala. Sütunlar gizlenebilir (progressive disclosure).

**5b — Loupe / büyük önizleme (`E`)** — tek öğe, orta alanı kaplar; alt şeritte komşu öğeler.
```
│  ‹  ┌──────────────────────────────────────────┐  ›   │
│     │                                          │      │
│     │            [ büyük görsel ]              │      │
│     │                                          │      │
│     └──────────────────────────────────────────┘      │
│     deprem-007.jpg · 4.2 MB · 3024×4032               │
│  ──────────────────────────────────────────────────  │
│  [🖼][🖼][▣ seçili][🖼][🖼][🎬][🖼]  ← film şeridi      │
```

**5c — Karşılaştır (`C`)** — çoklu seçimi yan yana (eleme/seçim için).
```
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│  │ [görsel A]    │ │ [görsel B]    │ │ [görsel C]    │ │
│  │ ★★★★☆        │ │ ★★★☆☆        │ │ ★★★★★        │ │
│  └───────────────┘ └───────────────┘ └───────────────┘ │
```

---

### Ekran 6 — Sağ Inspector (detay + çoklu seçim)

**Amaç:** Seçili öğenin tüm metadata'sı; düzenleme buradan.

```
┌──────────────────────┐        Çoklu seçimde:
│ ┌──────────────────┐ │        ┌──────────────────────┐
│ │   [önizleme]     │ │        │   ▣▣▣  3 öğe seçili  │
│ └──────────────────┘ │        │ ──────────────────── │
│ deprem-007.jpg       │        │ 🏷 Ortak etiketler   │
│ 4.2 MB · JPG · 3024px│        │   Ankara             │
│ ──────────────────── │        │ + Tümüne etiket ekle │
│ 🏷 Etiketler      +  │        │ 👤 + Kişi ata        │
│   [Ankara ✕][Acil ✕]│        │ ⭐ Toplu rating       │
│ 👤 Kişiler        +  │        │ ──────────────────── │
│   ( AY ) Ahmet Yılmaz│        │ [ Taşı ] [ Çöpe at ] │
│ 📝 Not               │        └──────────────────────┘
│  ┌────────────────┐  │
│  │ Saha çekimi,   │  │  ← Merriweather, ProseMirror
│  │ sabah 06:00…   │  │
│  └────────────────┘  │
│ 🔗 Kaynak           │
│   example.com/... ↗ │
│ ⭐ Derecelendirme    │
│   ★★★★☆             │
│ ──────────────────── │
│ [🕘 Geçmiş][👤 Atıf] │  ← sekme
│ [ ↗ Harici aç ]     │
└──────────────────────┘
```

- Etiket eklerken **9 bağlam-duyarlı öneri** + serbest yazım (Lightroom deseni). Hiyerarşik: `Ankara › TBMM`.
- Çoklu seçimde sadece **ortak alanlar** + toplu eylemler. Painter benzeri hızlı toplu etiket.
- Read-only durumda (başka cihaz / Viewer rolü) düzenleme alanları kilitli + "Salt görüntüleme" rozeti.

---

### Ekran 7 — Hızlı önizleme (QuickPreview, `Space`)

**Amaç:** Seçili dosyayı anında, tam ekran katmanda görmek (foto/video/ses/PDF). Eagle/Spacedrive deseni.

```
┌───────────────────────────────────────────────────────────┐
│  ✕                                          deprem-007.jpg │
│                                                           │
│  ‹              [ büyük görsel / oynatıcı ]            ›   │
│                                                           │
│        ▶ ──────●────────  00:42 / 03:18   🔊   (video/ses)│
│  ───────────────────────────────────────────────────────  │
│  🏷 Ankara · Acil    👤 Ahmet Yılmaz    ⭐★★★★☆           │
└───────────────────────────────────────────────────────────┘
```

- `Space` aç/kapa, `‹ ›` gez, `Esc` kapat. Ses için waveform, video için oynatıcı.
- shadcn: `Dialog` (tam ekran varyant).

---

### Ekran 8 — İçe aktarma deneyimi (drag-drop + kuyruk)

**Amaç:** Dosya eklerken net geri bildirim; kopyalama/hash/thumbnail ilerlemesi.

```
Sürükleme anında tüm pencere:        İçe aktarma kuyruğu (sağ alt):
┌─────────────────────────────┐      ┌──────────────────────────────┐
│ ╔═════════════════════════╗ │      │ İçe aktarılıyor — 3/12       │
│ ║   ⬇  Bırak: Kütüphaneye ║ │      │ ▰▰▰▰▰▰▱▱▱▱  deprem-09.jpg    │
│ ║      kopyalanacak        ║ │      │ ✓ deprem-07.jpg              │
│ ║                         ║ │      │ ✓ deprem-08.jpg              │
│ ╚═════════════════════════╝ │      │ ⟳ Hash + thumbnail…         │
└─────────────────────────────┘      │              [ Gizle ]       │
                                      └──────────────────────────────┘
```

- Harici diskten eklerken: "Güvenlik için kütüphaneye kopyalansın mı?" (varsayılan: evet).
- Kuyruk minimize edilebilir, alt çubuğa iner. Hata olan öğe kırmızı + "tekrar dene".

---

## BÖLÜM 3 — ÖZEL SAYFALAR

### Ekran 9 — Kişi kartı detay

**Amaç:** Bir kişinin künyesi + o kişiye bağlı tüm dosyalar.

```
┌──────────────────────────────────────────────────────────────┐
│ ‹ Kişiler / Ahmet Yılmaz                          [ Düzenle ] │
├───────────────────────┬──────────────────────────────────────┤
│  ( AY )               │  Ahmet Yılmaz'ın dosyaları    47 öğe  │
│  Ahmet Yılmaz         │  [⊞ Grid][≣ Liste]   ⌖ Filtre        │
│  Genel Yayın Yön.     │  ┌────┐┌────┐┌────┐┌────┐┌────┐      │
│  Gazete X             │  │ 🖼 ││ 🎬 ││ 🖼 ││ 🔊 ││ 🖼 │      │
│  ─────────────────    │  └────┘└────┘└────┘└────┘└────┘      │
│  📧 ahmet@…           │  ┌────┐┌────┐┌────┐┌────┐┌────┐      │
│  📱 +90 555 …         │  │ 🖼 ││ 🖼 ││ 📄 ││ 🖼 ││ 🖼 │      │
│  ─────────────────    │  └────┘└────┘└────┘└────┘└────┘      │
│  📝 Biyografi/Not     │                                      │
│  (Merriweather metin) │                                      │
└───────────────────────┴──────────────────────────────────────┘
```

- Künye solda sabit, dosyalar sağda grid/liste. Biyografi Merriweather.

---

### Ekran 10 — Etiket detay

**Amaç:** Bir etikete sahip öğeler + çapraz filtre kesişimi.

```
┌──────────────────────────────────────────────────────────────┐
│ ‹ Etiketler / # Ankara                              312 öğe   │
│  Kesişim:  [# Ankara ✕] [+ etiket ekle]  → daraltır          │
│  ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐           │
│  │ 🖼 ││ 🖼 ││ 🎬 ││ 🖼 ││ 🖼 ││ 🔊 ││ 🖼 ││ 🖼 │           │
│  └────┘└────┘└────┘└────┘└────┘└────┘└────┘└────┘           │
│  ⓘ "+ etiket ekle" ile "Ankara + 2024 + Deprem" kesişimi    │
└──────────────────────────────────────────────────────────────┘
```

---

### Ekran 11 — Komut paleti / global arama (`Ctrl+K`)

**Amaç:** Tek kutudan her şey: dosya, etiket, kişi, eylem. shadcn **`Command`**.

```
        ┌────────────────────────────────────────────────┐
        │ ⌕ deprem ankara|                               │
        ├────────────────────────────────────────────────┤
        │ DOSYALAR                                        │
        │  🖼 deprem-007.jpg        Ankara · Acil         │
        │  🎬 deprem-saha.mp4       Ankara                │
        │ ETİKETLER                                       │
        │  # Ankara (312)   # Deprem 2024 (88)            │
        │ KİŞİLER                                         │
        │  ( AY ) Ahmet Yılmaz                            │
        │ EYLEMLER                                        │
        │  ⌘ Yeni koleksiyon   ⌘ İçe aktar   ⌘ Ayarlar   │
        └────────────────────────────────────────────────┘
```

- Yazdıkça canlı sonuç (FTS5, <0.5 sn). Kategorize. Ok tuşlarıyla gezilir, Enter açar.
- Filtre operatörleri (ileri): `tür:video`, `kişi:Ahmet`, `⭐>=4` — acemi düz yazar, uzman operatör kullanır.

---

### Ekran 12 — Aktivite akışı (kim ne yaptı)

**Amaç:** Workspace geneli "aktör + nesne + eylem + zaman", sade dille (CRDT jargonu yok).

```
┌───────────────────────────────────────────────────────────┐
│ Aktivite                                    [ Tümü ▾ ]     │
│ ─────────────────────────────────────────────────────────  │
│ BUGÜN                                                       │
│  (AY) Ali  deprem-007.jpg'a "Acil" etiketini ekledi  · 2s │
│  (AD) Ayşe roportaj-bakan.mp4 dosyasını ekledi       · 3s │
│  (AY) Ali  "Deprem 2024" koleksiyonunu oluşturdu     · 5s │
│ DÜN                                                        │
│  (AD) Ayşe ses-kaydi-03.mp3'ü yeniden adlandırdı    · 1g │
│  (AY) Ali  12 dosyayı çöpe taşıdı            [ Geri al ]  │
└───────────────────────────────────────────────────────────┘
```

- Her satır tıklanınca ilgili dosyaya/öğeye gider. Geri-alınabilir eylemlerde satır içi "Geri al".
- Filtre: kişi / tür / tarih. Avatar + sade cümle. Zaman göreli ("2 saat önce").

---

### Ekran 13 — Dosya sürüm geçmişi

**Amaç:** Bir dosyanın eski hâlleri; "bu sürüme dön". (Inspector "Geçmiş" sekmesinden veya tam sayfa.)

```
┌───────────────────────────────────────────────────────────┐
│ deprem-007.jpg — Sürüm Geçmişi                      ✕      │
│ ─────────────────────────────────────────────────────────  │
│ ● Şu anki   (AY) Ali · 2 saat önce · 4.2 MB               │
│ │           "Acil etiketi eklendi"                         │
│ ○ Sürüm 2   (AD) Ayşe · dün · 4.2 MB        [ Önizle ][↩]│
│ │           "Not güncellendi"                              │
│ ○ Sürüm 1   (AY) Ali · 3 gün önce · 3.9 MB  [ Önizle ][↩]│
│             "İlk eklenme"                                  │
│ ─────────────────────────────────────────────────────────  │
│ ⓘ Eski sürümler içerik-adresli depoda saklanır, yer       │
│   neredeyse hiç harcamaz.                                  │
└───────────────────────────────────────────────────────────┘
```

- `[↩]` = bu sürüme dön (yeni sürüm olarak geri yükler, eskisi kaybolmaz). `[Önizle]` = QuickPreview'da aç.
- Hem dosya içeriği hem metadata değişiklikleri tek zaman çizgisinde, atıflı.

---

### Ekran 14 — Çöp kutusu

**Amaç:** Soft-delete, 30 gün, güvenli geri alma.

```
┌───────────────────────────────────────────────────────────┐
│ Çöp Kutusu                          18 öğe · 30 gün sonra  │
│ ─────────────────────────────────────────────────────────  │
│ [ Seçilenleri geri al ]  [ Kalıcı sil ]   ⌖ Filtre        │
│  ┌────┐┌────┐┌────┐┌────┐┌────┐                           │
│  │ 🖼 ││ 🖼 ││ 🎬 ││ 🖼 ││ 📄 │   silinme: 3 gün önce     │
│  └────┘└────┘└────┘└────┘└────┘   kalan: 27 gün           │
│ ⚠ "Kalıcı sil" geri alınamaz.                             │
└───────────────────────────────────────────────────────────┘
```

- Peer'da silinen dosya burada "onayını bekliyor" rozetiyle de gelebilir (bkz. Ekran 17 çatışma mantığı).

---

## BÖLÜM 4 — İŞBİRLİĞİ (Iroh, saf-davet)

### Ekran 15 — Paylaşım / Üyeler paneli

**Amaç:** Workspace üyeleri + rolleri; davet başlatma.

```
┌───────────────────────────────────────────────────────────┐
│ Gazete X Arşivi — Üyeler                       [ + Davet ] │
│ ─────────────────────────────────────────────────────────  │
│ (AY) Ali Yılmaz      Owner   🟢 çevrimiçi    (sen)        │
│ (AD) Ayşe Demir      Editor  🟢 çevrimiçi    [ Rol ▾ ][✕]│
│ (MK) Mehmet Kaya     Viewer  ○ çevrimdışı    [ Rol ▾ ][✕]│
│ ─────────────────────────────────────────────────────────  │
│ BEKLEYEN DAVETLER                                          │
│  🔗 Editor daveti · 2 gün geçerli   [ Linki kopyala ][İptal]│
└───────────────────────────────────────────────────────────┘
```

- Rol değişimi/çıkarma sadece Owner'da. Roller: Owner / Editor / Viewer.

---

### Ekran 16 — Davet linki oluştur

**Amaç:** Rol seç → link üret → paylaş. Tek diyalog, sezgisel.

```
        ┌──────────────────────────────────────────┐
        │ Birini davet et                     ✕    │
        │ ────────────────────────────────────────  │
        │ Rol:  ( ) Viewer  (•) Editor  ( ) Owner  │
        │       Editor: dosya ekler, etiket/not     │   ← seçilen rolün açıklaması
        │       düzenler.                           │
        │ Geçerlilik:  [ 7 gün ▾ ]                  │
        │ ────────────────────────────────────────  │
        │  🔗 yad://invite/x9f2…a7   [ 📋 Kopyala ] │
        │  ⓘ Bu linki güvendiğin kişiyle paylaş.    │
        │     Link sahibi arşive katılabilir.       │
        │                          [ Bitti ]        │
        └──────────────────────────────────────────┘
```

- Link üretilince büyük, kopyalanabilir. "Paylaş" sistem paylaşımını açabilir. Güvenlik uyarısı sade.

---

### Ekran 17 — Davet ile katılma (alıcı tarafı)

**Amaç:** Linke tıklayan kişide net karşılama.

```
        ┌──────────────────────────────────────────┐
        │           ◆ YAD                           │
        │ Ali Yılmaz seni bir arşive davet etti     │
        │                                          │
        │     📚  Gazete X Arşivi                   │
        │         Rolün: Editor                     │
        │                                          │
        │  ⓘ Katılınca dosyalar cihazına            │
        │    senkronlanmaya başlar.                 │
        │                                          │
        │            [ Reddet ]   [ Katıl ]         │
        └──────────────────────────────────────────┘
```

- YAD kuruluysa uygulamada açılır; değilse indirme sayfasına yönlendirir.

---

### Ekran 18 — Çatışma çözüm modalı (sadece çatışma varsa)

**Amaç:** Nadir; iki kişi aynı alanı çakışık değiştirince. Diff göster, seç. Obsidian-Syncthing deseni.

```
        ┌──────────────────────────────────────────────┐
        │ ⚠ 1 çatışma çözülmeli                  ✕    │
        │ ──────────────────────────────────────────  │
        │ deprem-007.jpg — Not alanı                  │
        │ ┌─────────────────┐  ┌─────────────────┐    │
        │ │ Senin sürümün   │  │ Ayşe'nin sürümü │    │
        │ │ "Saha çekimi,   │  │ "Saha çekimi,   │    │
        │ │  sabah 06:00"   │  │  06:00 Ankara"  │    │
        │ │ [ Bunu tut ]    │  │ [ Bunu tut ]    │    │
        │ └─────────────────┘  └─────────────────┘    │
        │              [ İkisini birleştir ]          │
        └──────────────────────────────────────────────┘
```

- Çoğu şey CRDT ile otomatik birleşir; bu ekran **sadece** gerçek çatışmada çıkar. Temizlenince "Çatışma kalmadı ✓".

---

### Ekran 19 — Peer / Senkron durumu (popover)

**Amaç:** Üst bardaki `⟳` veya alt çubuk tıklanınca açılır özet. Jargonsuz.

```
              ┌────────────────────────────────────┐
              │ Senkron                            │
              │ ──────────────────────────────────  │
              │ ✓ Kütüphane güncel · 1 peer ile     │
              │ 🟢 Ayşe Demir   az önce eşitlendi   │
              │ ○ Mehmet Kaya   çevrimdışı          │
              │ ──────────────────────────────────  │
              │ ⬇ deprem-saha.mp4 indiriliyor 60%  │
              │ ──────────────────────────────────  │
              │ Bağlantı: doğrudan (P2P) · şifreli  │
              └────────────────────────────────────┘
```

- "doğrudan (P2P)" veya "relay üzerinden" + "şifreli" rozeti. Gazeteci güveni için açık ama sade.

---

## BÖLÜM 5 — AYARLAR

### Ekran 20 — Ayarlar (kategorili + içinde arama)

**Amaç:** Tüm tercihler; sol kategori + sağ içerik. setproduct/Linear deseni.

```
┌──────────────────────────────────────────────────────────────┐
│ Ayarlar                                  ⌕ Ayarlarda ara      │
├──────────────────────┬───────────────────────────────────────┤
│ ▸ Genel              │  Görünüm                               │
│ ▸ Görünüm & Tema  ◀  │  ──────────────────────────────────   │
│ ▸ Kütüphane & Volume │  Tema    ( ) Açık ( ) Koyu (•) Sistem │
│ ▸ Senkron & Ağ       │  Dil     [ Türkçe ▾ ]                  │
│ ▸ Gizlilik & Güvenlik│  Grid yoğunluğu  ──●──────            │
│ ▸ Profil             │  Köşe rozetleri  [✓] Etiket [✓] Not   │
│ ▸ Klavye Kısayolları │                  [✓] Senkron [ ] GPS  │
│ ▸ Güncelleme         │  ────────────────────────────────────  │
│ ▸ Hakkında           │  ▸ Gelişmiş görünüm seçenekleri        │
└──────────────────────┴───────────────────────────────────────┘
```

**Kategori içerikleri (özet):**
- **Genel:** başlangıçta açılış, varsayılan görünüm, çöp kutusu süresi.
- **Görünüm & Tema:** tema, dil, grid yoğunluğu, rozetler.
- **Kütüphane & Volume:** kütüphaneler, konum, harici-dosya kopyalama davranışı, bütünlük taraması.
- **Senkron & Ağ:** senkron aç/kapa, **relay (self-host adresi)**, discovery, "sadece yerel ağ" modu. (İleri katman.)
- **Gizlilik & Güvenlik:** read-only davranışı, atıf gösterimi, anahtar yedekleme.
- **Klavye Kısayolları:** tam liste + (ileride) özelleştirme.
- **Güncelleme:** sürüm, otomatik güncelleme aç/kapa, "şimdi denetle".
- **Hakkında:** sürüm, lisans, açık format/veri konumu, gizlilik.

---

### Ekran 21 — Klavye kısayolları referansı (`?`)

**Amaç:** Hızlandırıcıları talep üzerine göster (acemiyi boğmadan).

```
        ┌──────────────────────────────────────────────┐
        │ Klavye Kısayolları                      ✕    │
        │ ──────────────────────────────────────────  │
        │ GÖRÜNÜM            DÜZENLEME                 │
        │  G  Grid            T  Etiket ekle           │
        │  L  Liste           N  Not                   │
        │  E  Loupe           1–5 Rating               │
        │  C  Karşılaştır     Del Çöpe taşı            │
        │ GENEL                                        │
        │  Ctrl+K Ara/komut   Space Önizleme           │
        │  +/−  Yoğunluk       Esc  Kapat              │
        └──────────────────────────────────────────────┘
```

---

## BÖLÜM 6 — SİSTEM DURUMLARI (her ekranda)

### Ekran 22 — Boş durumlar (empty states)

```
Boş kütüphane:                       Boş arama sonucu:
┌────────────────────────────┐       ┌────────────────────────────┐
│                            │       │                            │
│        ◆                   │       │        ⌕                   │
│  Arşivin henüz boş         │       │  "xyz" için sonuç yok       │
│  İlk dosyanı sürükle ya da │       │  Farklı bir terim dene ya   │
│  [ Dosya ekle ]            │       │  da filtreyi temizle.       │
│                            │       │  [ Filtreyi temizle ]       │
└────────────────────────────┘       └────────────────────────────┘
```
- Tek net eylem, kişilikli ama abartısız. Çöp kutusu boş, kişi yok, koleksiyon boş vb. için ayrı varyantlar.

### Ekran 23 — Yükleniyor (skeleton)
```
│ ┌────┐┌────┐┌────┐┌────┐┌────┐   ← gri bloklar, gerçek grid     │
│ │▒▒▒▒││▒▒▒▒││▒▒▒▒││▒▒▒▒││▒▒▒▒│     düzeninde nabız animasyonu   │
│ └────┘└────┘└────┘└────┘└────┘                                   │
```

### Ekran 24 — Hata / çevrimdışı
```
┌────────────────────────────────────────────┐
│ ⚠ Bu volume şu an bağlı değil               │
│ "USB Bellek" takılı değil. İçeriği görebilir │
│ ama dosyaları açamazsın.                     │
│                       [ Yeniden tara ]       │
└────────────────────────────────────────────┘
```

### Ekran 25 — Toast / bildirim (optimistic geri-alma dahil)
```
                          ┌──────────────────────────────┐
                          │ ✓ "Acil" etiketi eklendi      │
                          └──────────────────────────────┘
                          ┌──────────────────────────────┐
                          │ ⚠ Etiket eklenemedi, geri      │
                          │   alındı.        [ Tekrar dene ]│
                          └──────────────────────────────┘
```

### Ekran 26 — Alt durum çubuğu (genişletilmiş)
```
│ 📀 2/3 volume bağlı · 🟢 1 peer çevrimiçi · ⟳ Güncel · v1.0.0   🔔 ● │
   └ tıkla: volume paneli   └ tıkla: senkron popover   └ güncelleme  └ bildirim
```
- `🔔 ●` = okunmamış bildirim. Güncelleme varsa `v1.0.0 → 1.1.0 ⬆` rozeti.

---

## BÖLÜM 7 — RESPONSIVE / PANEL DAVRANIŞI

- **Sağ inspector kapatılabilir** (uzman tam-genişlik grid). `Esc` veya üst bar toggle.
- **Sol panel daraltılır** (sadece ikonlar). Dar pencerede otomatik daralır.
- **Minimum genişlik altında** sağ panel `Sheet` (üstten/yandan kayan) olur.
- Tüm paneller `ResizablePanelGroup` ile sürükle-boyutlandırılır; oranlar hatırlanır.

---

## EK — Ekran ↔ shadcn bileşen haritası (kodlama için)

| Ekran | Ana shadcn bileşenleri |
|-------|------------------------|
| Shell / 3-panel | `Sidebar`, `ResizablePanelGroup`, `ResizableHandle` |
| Üst bar arama | `Command` (Ctrl+K), `Input` |
| Grid/Liste | `ScrollArea`, `Table` (liste), `ContextMenu`, `Checkbox` |
| Inspector | `Tabs`, `Badge`, `Input`, `Textarea`(+ProseMirror), `Tooltip`, `Accordion` |
| QuickPreview | `Dialog` (fullscreen) |
| Onboarding | `Dialog`, `RadioGroup`, `Progress`, `Button` |
| Davet | `Dialog`, `RadioGroup`, `Select`, `Button` |
| Çatışma | `Dialog`, `ScrollArea` |
| Senkron/peer | `Popover`, `Avatar`, `Progress` |
| Ayarlar | `Tabs`/özel sol-nav, `Switch`, `Select`, `Slider`, `Checkbox`, `Input` |
| Toast | `Sonner`/`Toast` |
| Boş/hata | özel + `Button` |

---

*YAD Wireframe v1 — PRD v0.4 ile hizalı. Mockup onayından sonra bileşen bileşen kodlamaya geçilir.*
