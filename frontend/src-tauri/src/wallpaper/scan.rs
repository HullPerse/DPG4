use std::fs;
use std::path::Path;

use serde::Serialize;
use tauri::AppHandle;

use super::{
    bundled_wallpapers_dir, custom_wallpapers_dir, is_image_path, CmdResult,
};
use crate::error::AppError;

#[derive(Debug, Clone, Serialize)]
pub struct Wallpaper {
    pub name: String,
    pub path: String,
    /// File size in bytes (for UI).
    pub size: u64,
}

fn scan_dir(dir: &Path, default_prefix: bool) -> CmdResult<Vec<Wallpaper>> {
    let mut out = Vec::new();
    if !dir.exists() {
        return Ok(out);
    }

    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() || !is_image_path(&path) {
            continue;
        }
        let Some(name_str) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        let name = if default_prefix {
            format!("Default: {name_str}")
        } else {
            name_str.to_string()
        };
        let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
        out.push(Wallpaper {
            name,
            path: path.to_string_lossy().to_string(),
            size,
        });
    }

    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
}

pub fn collect_wallpapers(app: &AppHandle) -> CmdResult<Vec<Wallpaper>> {
    let mut wallpapers = scan_dir(&bundled_wallpapers_dir(app)?, true)?;
    wallpapers.extend(scan_dir(&custom_wallpapers_dir(app)?, false)?);
    Ok(wallpapers)
}

pub fn find_wallpaper_path(app: &AppHandle, name: &str) -> CmdResult<String> {
    for wp in collect_wallpapers(app)? {
        if wp.name == name {
            return Ok(wp.path);
        }
    }
    Err(AppError::WallpaperNotFound(name.to_string()))
}
