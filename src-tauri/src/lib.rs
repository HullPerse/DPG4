use serde::Serialize;
use std::fs;
use std::path::Path;
use tauri::Manager;

#[derive(Serialize)]
struct Wallpaper {
    name: String,
    path: String,
}

#[tauri::command]
async fn get_wallpaper_by_name(app: tauri::AppHandle, name: String) -> Result<String, String> {
    //get default wallpapers
    let default_wallpapers_dir = Path::new("assets/wallpapers");

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

    //get default wallpapers
    let default_wallpapers_dir = Path::new("assets/wallpapers");

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_wallpapers,
            get_wallpaper_data,
            save_wallpaper,
            delete_wallpaper,
            get_wallpaper_by_name
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
