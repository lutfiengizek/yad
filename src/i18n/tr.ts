const tr = {
  app: {
    name: "YAD",
    version: "v0.1.0",
  },
  sidebar: {
    search: "Ara",
    workspace: "Workspace",
    folders: "Klasörler",
    tags: "Etiketler",
    persons: "Kişiler",
    volumes: "Volume'lar",
    volumeStatus: {
      connected: "Bağlı",
      disconnected: "Bağlı Değil",
      syncing: "Senkronize ediliyor",
    },
  },
  content: {
    emptyState: "Dosya seçilmedi",
    dragDropHint: "Dosyaları buraya sürükleyin",
    noFiles: "Bu klasörde dosya yok",
  },
  inspector: {
    preview: "Önizleme",
    tags: "Etiketler",
    persons: "Kişiler",
    notes: "Notlar",
    url: "Kaynak URL",
    rating: "Değerlendirme",
    volume: "Volume",
    metadata: "Metadata",
    openExternal: "Harici uygulamada aç",
  },
  common: {
    save: "Kaydet",
    cancel: "İptal",
    delete: "Sil",
    edit: "Düzenle",
    add: "Ekle",
    close: "Kapat",
    loading: "Yükleniyor...",
    error: "Hata",
    success: "Başarılı",
    confirm: "Onayla",
  },
} as const;

export type TranslationKeys = typeof tr;
export default tr;
