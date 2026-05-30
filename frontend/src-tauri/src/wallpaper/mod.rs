mod commands;
mod image_util;
mod scan;

pub use commands::*;

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::error::{AppError, CmdResult};

pub const IMAGE_EXTENSIONS: &[&str] =
    &["jpg", "jpeg", "png", "gif", "bmp", "webp"];

pub const MAX_WALLPAPER_BYTES: usize = 10 * 1024 * 1024;

pub fn is_image_path(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|ext| IMAGE_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

pub fn bundled_wallpapers_dir(app: &AppHandle) -> CmdResult<PathBuf> {
    let resource_dir = app.path().resource_dir()?;
    Ok(resource_dir.join("assets/wallpapers"))
}

pub fn custom_wallpapers_dir(app: &AppHandle) -> CmdResult<PathBuf> {
    let app_data = app.path().app_data_dir()?;
    Ok(app_data.join("wallpapers"))
}

pub fn is_under_custom_dir(app: &AppHandle, path: &Path) -> CmdResult<bool> {
    let custom = custom_wallpapers_dir(app)?;
    Ok(path.starts_with(&custom))
}

pub fn is_bundled_wallpaper(app: &AppHandle, path: &Path) -> CmdResult<bool> {
    let bundled = bundled_wallpapers_dir(app)?;
    Ok(path.starts_with(&bundled))
}

pub fn sanitize_filename(name: &str) -> CmdResult<String> {
    if name.is_empty() {
        return Err(AppError::InvalidFilename);
    }
    if name.contains("..") || name.contains('/') || name.contains('\\') {
        return Err(AppError::InvalidFilename);
    }
    let ext = Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    if !ext.is_empty() && !IMAGE_EXTENSIONS.contains(&ext.to_lowercase().as_str()) {
        return Err(AppError::InvalidFilename);
    }
    Ok(name.to_string())
}

pub fn decode_data_url(data: &str) -> CmdResult<Vec<u8>> {
    if !data.starts_with("data:") {
        return Err(AppError::InvalidDataUrl);
    }
    let base64_data = data
        .find(',')
        .map(|i| &data[i + 1..])
        .filter(|s| !s.is_empty())
        .ok_or(AppError::InvalidDataUrl)?;

    use base64::{engine::general_purpose, Engine as _};
    let decoded = general_purpose::STANDARD.decode(base64_data)?;
    if decoded.len() > MAX_WALLPAPER_BYTES {
        return Err(AppError::FileTooLarge(
            decoded.len(),
            MAX_WALLPAPER_BYTES,
        ));
    }
    Ok(decoded)
}
