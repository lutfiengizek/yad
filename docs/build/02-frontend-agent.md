# YAD — Frontend Agent Brief

**Rolün:** YAD'ın tüm arayüzünü (`src/`) inşa etmek. Backend'e dokunmazsın (`src-tauri/` yasak).

## Önce oku (sırayla)
1. `docs/build/00-build-overview.md` — işbirliği modeli, milestone'lar, test politikası, "önce planla" akışı
2. `docs/build/01-api-contract.md` — backend ile sözleşmen (tipler, komutlar, event'ler, mock)
3. `docs/yad-wireframes-v1.md` — inşa edeceğin ekranlar & UX (birebir referans)
4. `yad-prd-v4.md` — ürün bağlamı & kararlar
5. `.claude/rules/architecture-rules.md` ve `.claude/rules/ui-rules.md` — **bağlayıcı kurallar**

## İlk çıktın: kısa PLAN, sonra direkt kod
`docs/build/plans/frontend-plan.md` üret: milestone bazında görev listesi, oluşturacağın dosya/bileşen ağacı, her görevin test yaklaşımı, definition of done, riskler. **Onay bekleme — planı yazdıktan sonra doğrudan kodlamaya başla.** Sadece gerçek bir belirsizlik/çelişki varsa sor.

## Kesin kurallar (ui-rules.md + architecture-rules.md)
- **shadcn iş akışı zorunlu:** Her bileşen için `search_items_in_registries` → `view_items_in_registries` → `get_item_examples_from_registries` → `get_add_command_for_items` (kur) → `get_audit_checklist`. **Var olan shadcn bileşenini sıfırdan yazma.**
- **Renkler yalnızca token** (`globals.css`): `bg-primary`, `text-muted-foreground` vb. Hardcode hex/rgb/hsl/oklch **YASAK**. Yeni renk gerekirse `globals.css`'e light+dark ekle.
- **Fontlar:** sadece solar-dusk 3 fontu — `font-sans` (Oxanium: UI/başlık/sayılar), `font-serif` (Merriweather: not/biyografi/uzun metin), `font-mono` (Fira Code: hash/teknik). Başka font ekleme.
- **Layout:** Sol = shadcn `Sidebar`; Orta+Sağ = `ResizablePanelGroup` + `ResizableHandle`. Tüm paneller boyutlandırılabilir.
- **Yasaklar:** `!important` yok, inline `style={{}}` yok, shadcn dışı UI kütüphanesi yok (tek istisna ProseMirror/tiptap), CSS-in-JS yok, renk için arbitrary Tailwind değeri yok.
- **Dark mode:** her değişiklik **açık + koyu** temada test edilir.
- **State:** Zustand, domain başına store (`useFileStore`, `useTagStore`, `usePersonStore`, `useVolumeStore` …). Store'lar mutasyonu `api` üzerinden yapar; backend state'ini doğrudan değiştirmez.
- **i18n:** tüm kullanıcı-metni `src/i18n/` altında, key-tabanlı (`t("sidebar.volumes")`). İlk dil `tr`. Hardcoded metin yok.
- **Dosya adları:** kebab-case (`file-grid.tsx`, `use-volume.ts`). Bileşen adları PascalCase.

## API erişimi
- **Asla doğrudan `invoke` çağırma.** Her şey `src/lib/api/` katmanından (`api.fileList(...)` gibi). Bu katmanı sözleşmeye birebir uygun kur: `types.ts` + `client.ts` (gerçek) + `mock.ts` (sahte) + `index.ts`.
- Backend hazır olmayan komutlar için **mock** kullan; backend bitince gerçeğe geç (tip aynı, ekran değişmez).
- Yerel dosya/thumbnail göstermek için Tauri asset protokolü (`convertFileSrc(absPath/thumbnailPath)`).

## Test (definition of done)
- `pnpm test` (Vitest + Testing Library) — kritik bileşenler ve store mantığı.
- `pnpm lint` temiz, `pnpm build` (tsc) hatasız.
- **Açık + koyu tema** görsel kontrolü.
- Her ekran için **boş / yükleniyor / hata / dolu** durumları çalışır.
- Küçük, anlamlı commit.

## Milestone sırası (00-overview ile aynı; FE yarısı)
- **M0:** App shell (3-panel, Sidebar, Resizable, tema provider + `◑` toggle, i18n iskeleti, yönlendirme), `src/lib/api/` + mock katmanı, temel boş kabuk. → açık+koyu çalışır.
- **M1:** Onboarding (3 adım), kütüphane/volume sidebar (durum rozetli), drag-drop + import kuyruğu (`import:progress` dinle), Grid + Liste görünümü, boş durumlar.
- **M2:** Inspector (Tabs), etiket editörü (9 öneri + hiyerarşik + serbest), koleksiyonlar, kişi kartı sayfası, ProseMirror not (Merriweather), rating, çoklu seçim + toplu işlem.
- **M3:** Ctrl+K komut paleti (`Command`), filtreler, QuickPreview (`Dialog` fullscreen, Space), Loupe (E) + Karşılaştır (C), tek-tuş görünüm geçişleri.
- **M4:** Geçmiş sekmesi + sürüm geri-yükleme UI, aktivite akışı (aktör+nesne+eylem+zaman, i18n cümle), çöp kutusu.
- **M5:** Üyeler paneli, davet oluştur/katıl akışı, çatışma modalı, senkron/peer popover, read-only durum rozetleri.
- **M6:** Boş/hata/yükleme cilası, kısayol referansı (`?`), erişilebilirlik (focus, kontrast — solar-dusk sıcak paleti WCAG AA kontrol et), mikro-etkileşim ince ayarı.

## Tasarım disiplini (wireframe §0.6 — "AI-vibe'sız")
Tek aksan rengi (golden-brown, anlam taşır), gerçek tipografik kademe, yoğun-ama-nefes-alan düzen, tutarlı Lucide ikonları (tek stroke), ince/amaçlı mikro-etkileşim (120–200ms). Kaçın: ortalanmış her şey, gradyan, dev hero, kart-içinde-kart, abartılı gölge.

## Kapsam dışı (YAPMA)
Drive, .yad export, plugin/MCP ekranları, ara roller (Contributor/Manager), otomatik klasör izleme, video bookmark, reverse image/renk araması. Bunlar v1 dışı.
