#[allow(dead_code)]
pub struct AppState {
    // Phase 1: Will be expanded with volume registry, DB connections, etc.
}

#[allow(dead_code)]
impl AppState {
    pub fn new() -> Self {
        Self {}
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
