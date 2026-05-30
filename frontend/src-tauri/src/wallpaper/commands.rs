use std::fs;
use std::path::Path;

use tauri::AppHandle;

use super::image_util::{process_uploaded_image, SaveOptions};
use super::scan::{collect_wallpapers, find_wallpaper_path, Wallpaper};
use super::{
    custom_wallpapers_dir, decode_data_url, is_bundled_wallpaper, is_under_custom_dir,
    sanitize_filename, CmdResult,
};
use crate::error::AppError;

#[tauri::command]
pub fn get_wallpapers(app: AppHandle) -> CmdResult<Vec<Wallpaper>> {
    collect_wallpapers(&app)
}

#[tauri::command]
pub fn get_wallpaper_by_name(app: AppHandle, name: String) -> CmdResult<String> {
    find_wallpaper_path(&app, &name)
}

#[tauri::command]
pub async fn save_wallpaper(
    app: AppHandle,
    file_name: String,
    data: String,
    prefer_webp: Option<bool>,
    quality: Option<u8>,
) -> CmdResult<String> {
    let safe_name = sanitize_filename(&file_name)?;
    let stem = Path::new(&safe_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("wallpaper")
        .to_string();
    let dir = custom_wallpapers_dir(&app)?;
    let opts = SaveOptions {
        prefer_webp: prefer_webp.unwrap_or(false),
        quality: quality.unwrap_or(85).clamp(1, 100),
    };

    let processed = tauri::async_runtime::spawn_blocking(move || {
        let decoded = decode_data_url(&data)?;
        process_uploaded_image(&decoded, &stem, opts)
    })
    .await
    .map_err(|e| AppError::Image(format!("save task failed: {e}")))??;

    fs::create_dir_all(&dir)?;
    let file_path = dir.join(&processed.file_name);
    fs::write(&file_path, &processed.bytes)?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn delete_wallpaper(app: AppHandle, path: String) -> CmdResult<()> {
    let file_path = Path::new(&path);

    if is_bundled_wallpaper(&app, file_path)? {
        return Err(AppError::CannotDeleteDefault);
    }
    if !is_under_custom_dir(&app, file_path)? {
        return Err(AppError::PathNotAllowed);
    }

    fs::remove_file(file_path)?;
    Ok(())
}
