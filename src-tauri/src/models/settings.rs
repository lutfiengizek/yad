use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    System,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Locale {
    Tr,
    En,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DefaultView {
    Grid,
    List,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BadgeSettings {
    pub tag: bool,
    pub note: bool,
    pub sync: bool,
    pub person: bool,
}

/// Uygulama ayarları. Sözleşme: `Settings`.
///
/// `settings_set` kısmi (`Partial<Settings>`) bir yama alır; bu yüzden depolama
/// JSON olarak tutulur ve yama özyinelemeli birleştirilir (bkz. `commands::system`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub theme: Theme,
    pub locale: Locale,
    pub default_view: DefaultView,
    pub grid_density: u8,
    pub badges: BadgeSettings,
    pub trash_retention_days: u32,
    pub import_copy_default: bool,
    pub auto_update: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: Theme::System,
            locale: Locale::Tr,
            default_view: DefaultView::Grid,
            grid_density: 3,
            badges: BadgeSettings {
                tag: true,
                note: true,
                sync: true,
                person: true,
            },
            trash_retention_days: 30,
            import_copy_default: true,
            auto_update: true,
        }
    }
}
