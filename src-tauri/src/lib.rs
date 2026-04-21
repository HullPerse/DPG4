use font_loader::system_fonts;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::Manager;
use tauri::State;
use tauri_plugin_updater::UpdaterExt;

static STEAM_API_KEY: &str = "A860B0E16AC5F330EA23DE1D61B37F85";

#[derive(Serialize)]
struct Wallpaper {
    name: String,
    path: String,
}

#[tauri::command]
async fn get_wallpaper_by_name(app: tauri::AppHandle, name: String) -> Result<String, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))?;
    let default_wallpapers_dir = resource_dir.join("assets/wallpapers");

    if default_wallpapers_dir.exists() {
        let entries = fs::read_dir(default_wallpapers_dir)
            .map_err(|e| format!("Failed to read default wallpapers directory: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();

            if path.is_file() {
                if let Some(file_name) = path.file_name() {
                    if let Some(name_str) = file_name.to_str() {
                        // Check if the name matches (with or without "Default: " prefix)
                        if name == name_str || name == format!("Default: {}", name_str) {
                            return Ok(path.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }

    //get custom wallpapers
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let custom_wallpapers_dir = app_data_dir.join("wallpapers");

    if custom_wallpapers_dir.exists() {
        let entries = fs::read_dir(&custom_wallpapers_dir)
            .map_err(|e| format!("Failed to read custom wallpapers directory: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();

            if path.is_file() {
                if let Some(file_name) = path.file_name() {
                    if let Some(name_str) = file_name.to_str() {
                        if name == name_str {
                            return Ok(path.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }

    Err(format!("Wallpaper '{}' not found", name))
}

#[tauri::command]
async fn get_wallpapers(app: tauri::AppHandle) -> Result<Vec<Wallpaper>, String> {
    let mut wallpapers = Vec::new();

    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))?;
    let default_wallpapers_dir = resource_dir.join("assets/wallpapers");

    if default_wallpapers_dir.exists() {
        let entries = fs::read_dir(default_wallpapers_dir)
            .map_err(|e| format!("Failed to read default wallpapers directory: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();

            if path.is_file() {
                if let Some(file_name) = path.file_name() {
                    if let Some(name_str) = file_name.to_str() {
                        let file_extension =
                            path.extension().and_then(|ext| ext.to_str()).unwrap_or("");

                        if ["jpg", "jpeg", "png", "gif", "bmp", "webp"]
                            .contains(&file_extension.to_lowercase().as_str())
                        {
                            wallpapers.push(Wallpaper {
                                name: format!("Default: {}", name_str),
                                path: path.to_string_lossy().to_string(),
                            });
                        }
                    }
                }
            }
        }
    }

    //get custom wallpapers
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let custom_wallpapers_dir = app_data_dir.join("wallpapers");

    if custom_wallpapers_dir.exists() {
        let entries = fs::read_dir(&custom_wallpapers_dir)
            .map_err(|e| format!("Failed to read custom wallpapers directory: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();

            if path.is_file() {
                if let Some(file_name) = path.file_name() {
                    if let Some(name_str) = file_name.to_str() {
                        let file_extension =
                            path.extension().and_then(|ext| ext.to_str()).unwrap_or("");

                        if ["jpg", "jpeg", "png", "gif", "bmp", "webp"]
                            .contains(&file_extension.to_lowercase().as_str())
                        {
                            wallpapers.push(Wallpaper {
                                name: name_str.to_string(),
                                path: path.to_string_lossy().to_string(),
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(wallpapers)
}

#[tauri::command]
async fn get_wallpaper_data(path: String) -> Result<String, String> {
    let data = fs::read(&path).map_err(|e| format!("Failed to read wallpaper file: {}", e))?;

    let mime_type = mime_guess::from_path(&path)
        .first_or_octet_stream()
        .to_string();

    use base64::{engine::general_purpose, Engine as _};
    let base64_data = general_purpose::STANDARD.encode(&data);
    Ok(format!("data:{};base64,{}", mime_type, base64_data))
}

#[tauri::command]
async fn save_wallpaper(
    app: tauri::AppHandle,
    file_name: String,
    data: String,
) -> Result<String, String> {
    if file_name.is_empty() {
        return Err("Filename cannot be empty".to_string());
    }

    if file_name.contains("..") || file_name.contains('/') || file_name.contains('\\') {
        return Err("Invalid filename characters".to_string());
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let wallpapers_dir = app_data_dir.join("wallpapers");

    fs::create_dir_all(&wallpapers_dir)
        .map_err(|e| format!("Failed to create wallpapers directory: {}", e))?;

    let file_path = wallpapers_dir.join(&file_name);

    // Extract base64 data from data URL
    let base64_data = if data.starts_with("data:") {
        if let Some(comma_pos) = data.find(',') {
            let (_, base64_part) = data.split_at(comma_pos + 1);
            if base64_part.is_empty() {
                return Err("Invalid data URL: no base64 data found".to_string());
            }
            base64_part
        } else {
            return Err("Invalid data URL format: missing comma separator".to_string());
        }
    } else {
        return Err("Expected data URL format, received plain data".to_string());
    };

    if base64_data.is_empty() {
        return Err("Empty base64 data received".to_string());
    }

    use base64::{engine::general_purpose, Engine as _};
    let decoded_data = general_purpose::STANDARD.decode(base64_data).map_err(|e| {
        format!(
            "Base64 decode failed: {} (data length: {})",
            e,
            base64_data.len()
        )
    })?;

    const MAX_FILE_SIZE: usize = 10 * 1024 * 1024;
    if decoded_data.len() > MAX_FILE_SIZE {
        return Err(format!(
            "File too large: {} bytes (max: {})",
            decoded_data.len(),
            MAX_FILE_SIZE
        ));
    }

    fs::write(&file_path, decoded_data).map_err(|e| {
        format!(
            "Failed to write wallpaper to {}: {}",
            file_path.display(),
            e
        )
    })?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn delete_wallpaper(app: tauri::AppHandle, path: String) -> Result<(), String> {
    if path.starts_with("assets/wallpapers") {
        return Err("Cannot delete default wallpapers".to_string());
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let wallpapers_dir = app_data_dir.join("wallpapers");

    let file_path = Path::new(&path);
    if !file_path.starts_with(&wallpapers_dir) {
        return Err("Cannot delete files outside the wallpapers directory".to_string());
    }

    fs::remove_file(&path).map_err(|e| format!("Failed to delete wallpaper file: {}", e))?;

    Ok(())
}

#[derive(Serialize, Clone)]
pub struct FontInfo {
    pub name: String,
    pub path: String,
}

#[derive(Deserialize)]
pub struct SetFontPayload {
    pub font_name: String,
}

#[tauri::command]
fn get_all_fonts() -> Vec<FontInfo> {
    system_fonts::query_all()
        .into_iter()
        .filter_map(|path_str| {
            let path = PathBuf::from(&path_str);
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .map(|n| n.replace(|c: char| !c.is_alphanumeric() && c != ' ', " "))
                .map(|n| n.trim().to_string())
                .unwrap_or_else(|| "Unknown".to_string());
            if name.is_empty() {
                None
            } else {
                Some(FontInfo {
                    name,
                    path: path_str,
                })
            }
        })
        .collect()
}

#[tauri::command]
fn set_default_font(font_name: String, state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;
    state.selected_font = font_name;
    Ok(())
}

#[tauri::command]
fn get_default_font(state: State<'_, Mutex<AppState>>) -> Result<String, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    Ok(state.selected_font.clone())
}

pub struct AppState {
    pub selected_font: String,
}

#[derive(serde::Deserialize, serde::Serialize)]
struct SteamGame {
    appid: u64,
    name: String,
    img_icon_url: Option<String>,
    img_logo_url: Option<String>,
    has_community_visible_stats: Option<bool>,
    playtime_forever: u64,
    playtime_windows_forever: Option<u64>,
    playtime_mac_forever: Option<u64>,
    playtime_linux_forever: Option<u64>,
    rtime_last_played: Option<u64>,
    content_descriptorids: Option<Vec<i32>>,
}

#[derive(serde::Deserialize)]
struct SteamResponse {
    response: SteamGamesList,
}

#[derive(serde::Deserialize)]
struct VanityResponse {
    response: VanityResult,
}

#[derive(serde::Deserialize)]
struct VanityResult {
    success: i32,
    steamid: Option<String>,
    message: Option<String>,
}

#[derive(serde::Deserialize)]
struct SteamGamesList {
    #[allow(dead_code)]
    games: Option<Vec<SteamGame>>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct GameData {
    id: u64,
    name: String,
    image: String,
    capsule_image: String,
    background_image: String,
    steam_link: String,
    website_link: String,
    source: String,
}

fn make_game_data(appid: u64, name: String) -> GameData {
    GameData {
        id: appid,
        name,
        image: format!(
            "https://steamcdn-a.akamaihd.net/steam/apps/{}/header.jpg",
            appid
        ),
        capsule_image: format!(
            "https://steamcdn-a.akamaihd.net/steam/apps/{}/library_600x900.jpg",
            appid
        ),
        background_image: format!(
            "https://steamcdn-a.akamaihd.net/steam/apps/{}/library_hero.jpg",
            appid
        ),
        steam_link: format!("https://store.steampowered.com/app/{}/", appid),
        website_link: String::new(),
        source: "owned".to_string(),
    }
}

#[tauri::command]
async fn get_steam_family(access_token: String, steam_id: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let url = format!(
        "https://api.steampowered.com/IFamilyGroupsService/GetFamilyGroupForUser/v1/?access_token={}&steamid={}",
        access_token, steam_id
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Steam API request failed: {}", e))?
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let family_data: serde_json::Value =
        serde_json::from_str(&response).map_err(|e| format!("Failed to parse response: {}", e))?;

    let family_group_id = family_data
        .get("response")
        .and_then(|r| r.get("family_groupid"))
        .and_then(|v| v.as_str())
        .ok_or("No family group found")?;

    let url = format!(
        "https://api.steampowered.com/IFamilyGroupsService/GetSharedLibraryApps/v1/?access_token={}&family_groupid={}&include_own=true&include_free=true",
        access_token, family_group_id
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Steam API request failed: {}", e))?
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let json: serde_json::Value =
        serde_json::from_str(&response).map_err(|e| format!("Failed to parse response: {}", e))?;

    serde_json::to_string(&json).map_err(|e| format!("Failed to serialize: {}", e))
}

#[tauri::command]
async fn get_steam_library(steam_id: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let url = format!(
        "https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key={}&include_played_free_games=1&include_appinfo=1&steamid={}",
        STEAM_API_KEY, steam_id
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Steam API request failed: {}", e))?
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let steam_response: SteamResponse = serde_json::from_str(&response)
        .map_err(|e| format!("Failed to parse Steam response: {}", e))?;

    let games: Vec<GameData> = steam_response
        .response
        .games
        .unwrap_or_default()
        .into_iter()
        .map(|game| make_game_data(game.appid, game.name))
        .collect();

    serde_json::to_string(&games).map_err(|e| format!("Failed to serialize games: {}", e))
}

#[tauri::command]
async fn get_steam_game(app_id: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let url = format!(
        "https://store.steampowered.com/api/appdetails?appids={}",
        app_id.trim()
    );

    let response = client
        .get(&url)
        .header("Accept-Language", "en-US,en;q=0.9")
        .send()
        .await
        .map_err(|e| format!("Steam API request failed: {}", e))?
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let app_details: serde_json::Value = serde_json::from_str(&response)
        .map_err(|e| format!("Failed to parse Steam response: {}", e))?;

    let entry = app_details.get(&app_id.trim()).ok_or("App not found")?;

    let success = entry
        .get("success")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    if !success {
        return Err("App not found or unavailable".to_string());
    }

    let data = entry.get("data").ok_or("No game data available")?;

    let steam_app_id = data
        .get("steam_app_id")
        .or_else(|| data.get("appid"))
        .and_then(|v| v.as_u64())
        .unwrap_or_default();

    let name = data
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();

    let header_image = data
        .get("header_image")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();

    let capsule_image = data
        .get("capsule_image")
        .or_else(|| data.get("capsule_imagev5"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            format!(
                "https://steamcdn-a.akamaihd.net/steam/apps/{}/library_600x900.jpg",
                steam_app_id
            )
        });

    let background_image = data
        .get("background")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            format!(
                "https://steamcdn-a.akamaihd.net/steam/apps/{}/library_hero.jpg",
                steam_app_id
            )
        });

    let website_link = data
        .get("website")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();

    let game_data = GameData {
        id: steam_app_id,
        name,
        image: header_image,
        capsule_image,
        background_image,
        steam_link: format!("https://store.steampowered.com/app/{}/", steam_app_id),
        website_link,
        source: "owned".to_string(),
    };

    serde_json::to_string(&game_data).map_err(|e| format!("Failed to serialize game data: {}", e))
}

#[tauri::command]
async fn resolve_vanity_url(vanity_url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let url = format!(
        "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key={}&vanityurl={}",
        STEAM_API_KEY, vanity_url
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Steam API request failed: {}", e))?
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let vanity_response: VanityResponse = serde_json::from_str(&response)
        .map_err(|e| format!("Failed to parse Steam response: {}", e))?;

    if vanity_response.response.success == 1 {
        vanity_response
            .response
            .steamid
            .ok_or_else(|| "No steamid returned".to_string())
    } else {
        Err(vanity_response
            .response
            .message
            .unwrap_or_else(|| "Vanity URL not found".to_string()))
    }
}

#[tauri::command]
async fn update(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
    if let Some(update) = app.updater()?.check().await? {
        let mut downloaded = 0;

        // alternatively we could also call update.download() and update.install() separately
        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    println!("downloaded {downloaded} from {content_length:?}");
                },
                || {
                    println!("download finished");
                },
            )
            .await?;

        println!("update installed");
        app.restart();
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(AppState {
            selected_font: "Segoe UI".to_string(),
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_wallpapers,
            get_wallpaper_data,
            save_wallpaper,
            delete_wallpaper,
            get_wallpaper_by_name,
            get_all_fonts,
            set_default_font,
            get_default_font,
            get_steam_library,
            get_steam_family,
            get_steam_game,
            resolve_vanity_url,
            update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
