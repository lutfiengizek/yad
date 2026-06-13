//! M5 komutları: üyeler/roller, davet linki, senkron durumu.
//!
//! Roller Automerge'de yaşar (senkronlanır). Davet bileti, kütüphane + rol + davet edenin
//! NodeId'sini taşıyan, paylaşılabilir bir dizedir. **Canlı eşler-arası bağlanma/senkron 2-cihaz
//! testiyle doğrulanacak**; bu modül komut yüzeyini, bilet kodlamasını ve rol mantığını sağlar.

use crate::commands::{with_active, with_active_mut};
use crate::error::AppError;
use crate::metadata::MemberData;
use crate::models::{MemberInfo, Person, Role, SyncState, SyncStatus};
use crate::state::AppState;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rusqlite::{Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use tauri::State;

const INVITE_PREFIX: &str = "yad-invite:";

fn map_member(r: &Row) -> rusqlite::Result<MemberInfo> {
    Ok(MemberInfo {
        person: Person {
            id: r.get(0)?,
            full_name: r.get(1)?,
            title: r.get(2)?,
            organization: r.get(3)?,
            email: r.get(4)?,
            phone: r.get(5)?,
            avatar_path: r.get(6)?,
            bio: r.get(7)?,
            file_count: r.get::<_, i64>(8)? as u32,
        },
        role: Role::from_str(&r.get::<_, String>(9)?),
        online: false, // canlı eş takibi 2-cihaz entegrasyonunda
    })
}

pub fn list_members(conn: &Connection) -> Result<Vec<MemberInfo>, AppError> {
    let sql =
        "SELECT p.id, p.full_name, p.title, p.organization, p.email, p.phone, p.avatar_path, \
         p.bio, (SELECT count(*) FROM file_person fp WHERE fp.person_id = p.id), m.role \
         FROM member m JOIN person p ON p.id = m.person_id ORDER BY p.full_name COLLATE NOCASE";
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([], map_member)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

/// Yerel kullanıcının bu kütüphanedeki rolü (üye değilse `None`).
fn local_role(conn: &Connection, actor_id: &str) -> Result<Option<Role>, AppError> {
    let role: Option<String> = conn
        .query_row(
            "SELECT role FROM member WHERE person_id = ?1",
            [actor_id],
            |r| r.get(0),
        )
        .optional()?;
    Ok(role.map(|s| Role::from_str(&s)))
}

/// Owner gerektiren işlemler için kontrol. Henüz üye yoksa (işbirliği başlamadan) izin verilir.
fn require_owner(conn: &Connection, actor_id: &str) -> Result<(), AppError> {
    match local_role(conn, actor_id)? {
        Some(Role::Owner) | None => Ok(()),
        _ => Err(AppError::PermissionDenied(
            "bu işlem yalnızca Owner tarafından yapılabilir".into(),
        )),
    }
}

#[tauri::command]
pub fn member_list(state: State<'_, AppState>) -> Result<Vec<MemberInfo>, AppError> {
    with_active(&state, |a| list_members(&a.db))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetRoleInput {
    pub person_id: String,
    pub role: Role,
}

#[tauri::command]
pub fn member_set_role(state: State<'_, AppState>, input: SetRoleInput) -> Result<(), AppError> {
    with_active_mut(&state, |a| {
        require_owner(&a.db, &a.actor_id)?;
        if !a.metadata.read()?.members.contains_key(&input.person_id) {
            return Err(AppError::NotFound(format!("üye yok: {}", input.person_id)));
        }
        a.mutate_metadata(|m| {
            if let Some(mem) = m.members.get_mut(&input.person_id) {
                mem.role = input.role.as_str().to_string();
            }
        })
    })
}

#[tauri::command]
pub fn member_remove(state: State<'_, AppState>, person_id: String) -> Result<(), AppError> {
    with_active_mut(&state, |a| {
        require_owner(&a.db, &a.actor_id)?;
        a.mutate_metadata(|m| {
            m.members.remove(&person_id);
        })
    })
}

/// Owner'ı (yerel kullanıcı) üye olarak kurar — kütüphane oluşturulurken çağrılır.
pub fn ensure_owner_member(
    a: &mut crate::state::ActiveLibrary,
    node_id: Option<String>,
) -> Result<(), AppError> {
    if a.metadata.read()?.members.contains_key(&a.actor_id) {
        return Ok(());
    }
    let actor_id = a.actor_id.clone();
    let actor_name = a.actor_name.clone();
    a.mutate_metadata(|m| {
        // Yerel kullanıcının kişi kartı (yoksa) + owner üyeliği.
        m.persons
            .entry(actor_id.clone())
            .or_insert_with(|| crate::metadata::PersonData {
                full_name: actor_name.clone(),
                ..Default::default()
            });
        m.members.insert(
            actor_id.clone(),
            MemberData {
                role: "owner".into(),
                node_id,
            },
        );
    })
}

// ---- davet bileti ----

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InviteTicket {
    library_id: String,
    role: String,
    node_id: String,
    inviter_name: String,
    expires_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InviteCreateInput {
    pub role: Role,
    pub expires_in_days: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InviteLink {
    pub link: String,
    pub expires_at: String,
}

#[tauri::command]
pub fn invite_create(
    state: State<'_, AppState>,
    input: InviteCreateInput,
) -> Result<InviteLink, AppError> {
    // Davet edenin NodeId + adı (app-global kimlikten).
    let (node_id, inviter_name) = {
        let conn = state
            .app_db
            .lock()
            .map_err(|_| AppError::Unknown("durum kilidi bozuldu".into()))?;
        conn.query_row(
            "SELECT node_id, display_name FROM identity LIMIT 1",
            [],
            |r| Ok((r.get::<_, Option<String>>(0)?, r.get::<_, String>(1)?)),
        )
        .optional()?
        .ok_or_else(|| AppError::InvalidInput("önce kimlik kurulmalı".into()))?
    };
    let node_id = node_id.ok_or_else(|| AppError::InvalidInput("düğüm kimliği yok".into()))?;

    let expires_at =
        (chrono::Utc::now() + chrono::Duration::days(input.expires_in_days)).to_rfc3339();
    let library_id = with_active(&state, |a| Ok(a.meta.id.clone()))?;

    let ticket = InviteTicket {
        library_id,
        role: input.role.as_str().to_string(),
        node_id,
        inviter_name,
        expires_at: expires_at.clone(),
    };
    let json = serde_json::to_vec(&ticket)?;
    let link = format!("{INVITE_PREFIX}{}", URL_SAFE_NO_PAD.encode(json));
    Ok(InviteLink { link, expires_at })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InviteAcceptInput {
    pub link: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AcceptResult {
    pub library_id: String,
}

#[tauri::command]
pub fn invite_accept(
    _state: State<'_, AppState>,
    input: InviteAcceptInput,
) -> Result<AcceptResult, AppError> {
    let encoded = input
        .link
        .strip_prefix(INVITE_PREFIX)
        .ok_or_else(|| AppError::InvalidInput("geçersiz davet linki".into()))?;
    let json = URL_SAFE_NO_PAD
        .decode(encoded)
        .map_err(|_| AppError::InvalidInput("davet linki çözülemedi".into()))?;
    let ticket: InviteTicket = serde_json::from_slice(&json)
        .map_err(|_| AppError::InvalidInput("davet biçimi geçersiz".into()))?;

    // Süre kontrolü.
    if let Ok(exp) = chrono::DateTime::parse_from_rfc3339(&ticket.expires_at) {
        if exp < chrono::Utc::now() {
            return Err(AppError::InvalidInput("davet süresi dolmuş".into()));
        }
    }

    // Canlı katılım: davet edenin düğümüne bağlan + kütüphaneyi senkronla (2-cihaz entegrasyonu).
    // Burada bilet doğrulanır ve hedef kütüphane kimliği döndürülür.
    Ok(AcceptResult {
        library_id: ticket.library_id,
    })
}

#[tauri::command]
pub fn sync_status(state: State<'_, AppState>) -> Result<SyncStatus, AppError> {
    // Canlı eş takibi 2-cihaz entegrasyonunda; şimdilik hazır/boşta.
    let _ = state;
    Ok(SyncStatus {
        state: SyncState::Idle,
        peers_online: 0,
        last_synced_at: None,
        message: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn invite_roundtrip_encodes_and_decodes() {
        let ticket = InviteTicket {
            library_id: "lib-1".into(),
            role: "editor".into(),
            node_id: "abcd".into(),
            inviter_name: "Ayşe".into(),
            expires_at: (chrono::Utc::now() + chrono::Duration::days(7)).to_rfc3339(),
        };
        let json = serde_json::to_vec(&ticket).unwrap();
        let link = format!("{INVITE_PREFIX}{}", URL_SAFE_NO_PAD.encode(json));

        let encoded = link.strip_prefix(INVITE_PREFIX).unwrap();
        let decoded: InviteTicket =
            serde_json::from_slice(&URL_SAFE_NO_PAD.decode(encoded).unwrap()).unwrap();
        assert_eq!(decoded.library_id, "lib-1");
        assert_eq!(decoded.role, "editor");
    }
}
